use anchor_lang::prelude::*;

declare_id!("GC15UJT8ESPd93LVfGn7tHXNSWFG9wqX78Ty4GNapfSk");

#[program]
pub mod crypto_prediction_market {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
