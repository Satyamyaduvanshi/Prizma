use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, Transfer, transfer};

declare_id!("GC15UJT8ESPd93LVfGn7tHXNSWFG9wqX78Ty4GNapfSk");

pub const PLATFORM_FEE_BPS: u64 = 200; // 2% protocol fee
pub const BPS_DIVISOR: u64 = 10_000;

#[program]
pub mod crypto_prediction_market {
    use super::*;

    /// 1. Initialize a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        match_id: String,
        home_team: String,
        away_team: String,
        market_type: MarketType,
        kickoff_time: i64,
        close_time: i64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        // SECURITY: Cannot initialize a market for a game that is already locking or started
        require!(close_time > clock.unix_timestamp, PredictError::InvalidCloseTime);
        require!(kickoff_time > 0, PredictError::InvalidTimes);

        let market = &mut ctx.accounts.market;
        market.match_id = match_id;
        market.home_team = home_team;
        market.away_team = away_team;
        market.market_type = market_type;
        market.kickoff_time = kickoff_time;
        market.close_time = close_time;
        market.status = MarketStatus::Open;
        market.outcome = Outcome::Undecided;
        market.usdc_mint = ctx.accounts.usdc_mint.key();
        market.vault = ctx.accounts.vault.key();

        // Initialize AMM pools at 0
        market.yes_liquidity = 0;
        market.no_liquidity = 0;
        market.yes_shares_issued = 0;
        market.no_shares_issued = 0;
        market.bump = ctx.bumps.market;

        msg!("Market created: {} vs {} ({:?})", market.home_team, market.away_team, market.market_type);
        Ok(())
    }

    /// 2. Seed initial liquidity to set the starting odds at 50/50
    pub fn seed_liquidity(ctx: Context<SeedLiquidity>, yes_amount: u64, no_amount: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Open, PredictError::MarketNotOpen);

        let total = yes_amount.checked_add(no_amount).ok_or(PredictError::MathOverflow)?;
        
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seeder_usdc.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.seeder.to_account_info(),
                },
            ),
            total,
        )?;

        market.yes_liquidity = market.yes_liquidity.checked_add(yes_amount).ok_or(PredictError::MathOverflow)?;
        market.no_liquidity = market.no_liquidity.checked_add(no_amount).ok_or(PredictError::MathOverflow)?;

        Ok(())
    }

    /// 3. Users buy outcome shares using the constant-product AMM
    pub fn buy_shares(ctx: Context<BuyShares>, side: Side, usdc_in: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.position;
        
        require!(market.status == MarketStatus::Open, PredictError::MarketNotOpen);

        // SECURITY: Immutable time shield. Fails if the network clock passes close_time
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < market.close_time, PredictError::BettingWindowClosed);

        // AMM Pricing Logic
        let (shares_out, new_yes, new_no) = match side {
            Side::Yes => {
                let shares = market.yes_liquidity.checked_mul(usdc_in).ok_or(PredictError::MathOverflow)?
                    .checked_div(market.no_liquidity.checked_add(usdc_in).ok_or(PredictError::MathOverflow)?)
                    .ok_or(PredictError::MathOverflow)?;
                (shares, market.yes_liquidity.checked_sub(shares).ok_or(PredictError::MathOverflow)?, market.no_liquidity.checked_add(usdc_in).ok_or(PredictError::MathOverflow)?)
            }
            Side::No => {
                let shares = market.no_liquidity.checked_mul(usdc_in).ok_or(PredictError::MathOverflow)?
                    .checked_div(market.yes_liquidity.checked_add(usdc_in).ok_or(PredictError::MathOverflow)?)
                    .ok_or(PredictError::MathOverflow)?;
                (shares, market.yes_liquidity.checked_add(usdc_in).ok_or(PredictError::MathOverflow)?, market.no_liquidity.checked_sub(shares).ok_or(PredictError::MathOverflow)?)
            }
        };

        // Escrow funds
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            usdc_in,
        )?;

        // Update Market AMM state
        market.yes_liquidity = new_yes;
        market.no_liquidity = new_no;

        if position.market == Pubkey::default() {
            position.user = ctx.accounts.user.key();
            position.market = market.key();
            position.bump = ctx.bumps.position;
        }

        match side {
            Side::Yes => {
                market.yes_shares_issued = market.yes_shares_issued.checked_add(shares_out).ok_or(PredictError::MathOverflow)?;
                position.yes_shares = position.yes_shares.checked_add(shares_out).ok_or(PredictError::MathOverflow)?;
            }
            Side::No => {
                market.no_shares_issued = market.no_shares_issued.checked_add(shares_out).ok_or(PredictError::MathOverflow)?;
                position.no_shares = position.no_shares.checked_add(shares_out).ok_or(PredictError::MathOverflow)?;
            }
        }

        Ok(())
    }

    /// 4. Autonomous resolution triggered by anyone reading the TxLINE Devnet Feed
    pub fn resolve_market_with_txline(ctx: Context<ResolveMarketWithTxLine>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Open, PredictError::MarketNotOpen);

        // Validate we are reading the authentic TxLINE oracle on Devnet
        let txline_account_info = &ctx.accounts.txline_match_feed;
        require!(
            txline_account_info.owner == &pubkey!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
            PredictError::InvalidOracleOwner
        );

        // For the hackathon, we simulate reading the TxLINE buffer offsets:
        // Byte 0: is_full_time (1 = true), Byte 1: home_score, Byte 2: away_score
        let data = txline_account_info.try_borrow_data()?;
        require!(data.len() >= 3, PredictError::InvalidOracleData);
        
        let is_full_time = data[0] == 1; 
        let home_score = data[1];
        let away_score = data[2];

        require!(is_full_time, PredictError::MatchNotFinished);

        // Resolve based on the specific market type
        match market.market_type {
            MarketType::MatchWinner => {
                market.outcome = if home_score > away_score {
                    Outcome::YesWin // Yes side was mapped to Home
                } else if away_score > home_score {
                    Outcome::NoWin  // No side was mapped to Away
                } else {
                    Outcome::Draw
                };
            },
            MarketType::OverUnder2_5 => {
                let total_goals = home_score + away_score;
                market.outcome = if total_goals > 2 {
                    Outcome::YesWin // Over 2.5
                } else {
                    Outcome::NoWin  // Under 2.5
                };
            }
        }

        market.status = MarketStatus::Resolved;
        msg!("Market resolved trustlessly! Result: {:?}", market.outcome);
        Ok(())
    }

    /// 5. Winners claim their USDC payouts
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.position;

        require!(market.status == MarketStatus::Resolved, PredictError::MarketNotResolved);
        require!(!position.claimed, PredictError::AlreadyClaimed);

        let user_winning_shares = match market.outcome {
            Outcome::YesWin => position.yes_shares,
            Outcome::NoWin => position.no_shares,
            Outcome::Draw => (position.yes_shares + position.no_shares) / 2, // Refund on draw
            Outcome::Undecided => return err!(PredictError::MarketNotResolved),
        };

        if user_winning_shares == 0 {
            position.claimed = true;
            return Ok(());
        }

        let total_winning_shares = match market.outcome {
            Outcome::YesWin => market.yes_shares_issued,
            Outcome::NoWin => market.no_shares_issued,
            Outcome::Draw => (market.yes_shares_issued + market.no_shares_issued) / 2,
            Outcome::Undecided => return err!(PredictError::MarketNotResolved),
        };

        let vault_balance = ctx.accounts.vault.amount;
        let gross_payout = vault_balance.checked_mul(user_winning_shares).ok_or(PredictError::MathOverflow)?
            .checked_div(total_winning_shares).ok_or(PredictError::MathOverflow)?;

        // Deduct 2% platform fee
        let fee = gross_payout.checked_mul(PLATFORM_FEE_BPS).ok_or(PredictError::MathOverflow)?
            .checked_div(BPS_DIVISOR).ok_or(PredictError::MathOverflow)?;
        let net_payout = gross_payout.checked_sub(fee).ok_or(PredictError::MathOverflow)?;

        let seeds = &[b"market", market.match_id.as_bytes(), &[market.bump]];
        let signer_seeds = &[&seeds[..]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_usdc.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            net_payout,
        )?;

        position.claimed = true;
        Ok(())
    }
}

// ─────────────────────────────────────────────
//  Contexts & Data Structures
// ─────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 4 + 32 + 4 + 32 + 4 + 32 + 1 + 8 + 8 + 1 + 1 + 32 + 32 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"market", match_id.as_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SeedLiquidity<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub seeder_usdc: InterfaceAccount<'info, TokenAccount>,
    
    pub seeder: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 32 + 8 + 8 + 1 + 1,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    
    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ResolveMarketWithTxLine<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    /// CHECK: Checked via owner verification in instruction logic
    pub txline_match_feed: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    pub market: Account<'info, Market>,
    
    #[account(mut, seeds = [b"position", market.key().as_ref(), user.key().as_ref()], bump = position.bump)]
    pub position: Account<'info, Position>,
    
    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
pub struct Market {
    pub match_id: String,
    pub home_team: String,
    pub away_team: String,
    pub market_type: MarketType,
    pub kickoff_time: i64,
    pub close_time: i64,
    pub status: MarketStatus,
    pub outcome: Outcome,
    pub usdc_mint: Pubkey,
    pub vault: Pubkey,
    pub yes_liquidity: u64,
    pub no_liquidity: u64,
    pub yes_shares_issued: u64,
    pub no_shares_issued: u64,
    pub bump: u8,
}

#[account]
pub struct Position {
    pub user: Pubkey,
    pub market: Pubkey,
    pub yes_shares: u64,
    pub no_shares: u64,
    pub claimed: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum MarketType { MatchWinner, OverUnder2_5 }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum MarketStatus { Open, Resolved }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum Outcome { Undecided, YesWin, NoWin, Draw }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum Side { Yes, No }

#[error_code]
pub enum PredictError {
    #[msg("Market is not currently open")] MarketNotOpen,
    #[msg("Math Overflow")] MathOverflow,
    #[msg("Account data does not match trusted TxLINE oracle footprint")] InvalidOracleOwner,
    #[msg("Data feed layout is invalid or corrupted")] InvalidOracleData,
    #[msg("Match outcome hasn't reached full time yet according to data feed")] MatchNotFinished,
    #[msg("Target market state has not resolved yet")] MarketNotResolved,
    #[msg("Earnings already pulled from pool")] AlreadyClaimed,
    #[msg("Betting closing time must occur in the future")] InvalidCloseTime,
    #[msg("Kickoff time must be valid")] InvalidTimes,
    #[msg("Trading window has closed for this match. No more bets accepted.")] BettingWindowClosed,
}