"use client";

import React from "react";

// Real Google Live Sports Data - July 2026 World Cup Knockouts
const bracketData = {
  quarterfinals: [
    {
      id: "qf1",
      date: "Fri, 10 Jul",
      status: "FT",
      home: { name: "France", score: "2", isWinner: true, flag: "🇫🇷" },
      away: { name: "Morocco", score: "0", isWinner: false, flag: "🇲🇦" },
    },
    {
      id: "qf2",
      date: "Sat, 11 Jul",
      status: "FT",
      home: { name: "Spain", score: "2", isWinner: true, flag: "🇪🇸" },
      away: { name: "Belgium", score: "1", isWinner: false, flag: "🇧🇪" },
    },
    {
      id: "qf3",
      date: "Yesterday",
      status: "FT",
      home: { name: "Norway", score: "1", isWinner: false, flag: "🇳🇴" },
      away: { name: "England", score: "2", isWinner: true, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    },
    {
      id: "qf4",
      date: "Yesterday",
      status: "FT",
      home: { name: "Argentina", score: "3", isWinner: true, flag: "🇦🇷" },
      away: { name: "Switzerland", score: "1", isWinner: false, flag: "🇨🇭" },
    },
  ],
  semifinals: [
    {
      id: "sf1",
      date: "Wed, 15 Jul, 12:30 am",
      status: "",
      home: { name: "France", score: "", isWinner: false, flag: "🇫🇷" },
      away: { name: "Spain", score: "", isWinner: false, flag: "🇪🇸" },
    },
    {
      id: "sf2",
      date: "Thu, 16 Jul, 12:30 am",
      status: "",
      home: { name: "England", score: "", isWinner: false, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      away: { name: "Argentina", score: "", isWinner: false, flag: "🇦🇷" },
    },
  ],
  finals: [
    {
      id: "f1",
      date: "Mon, 20 Jul, 12:30 am",
      status: "",
      home: { name: "TBD", score: "", isWinner: false, flag: "🛡️" },
      away: { name: "TBD", score: "", isWinner: false, flag: "🛡️" },
    },
  ],
};

// Reusable component for the individual match cards
const MatchCard = ({ match }: { match: any }) => {
  return (
    <div className="w-64 bg-[#202124] hover:bg-[#2A2B2E] transition-colors border border-white/5 rounded-xl p-3.5 shadow-lg flex flex-col gap-3 font-sans relative z-10 cursor-pointer group">
      {/* Header: Date & Status */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-400 font-medium">{match.date}</span>
        {match.status && (
          <span className="bg-white/10 text-gray-300 px-2 py-0.5 rounded-full font-semibold text-[10px]">
            {match.status}
          </span>
        )}
      </div>

      {/* Teams Container */}
      <div className="flex flex-col gap-2.5">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg leading-none">{match.home.flag}</span>
            <span className={`text-sm tracking-wide ${match.home.isWinner ? "text-white font-semibold" : "text-gray-300 font-normal"}`}>
              {match.home.name}
            </span>
          </div>
          <div className="flex items-center">
            <span className={`text-sm ${match.home.isWinner ? "text-white font-bold" : "text-gray-400"}`}>
              {match.home.score}
            </span>
            {/* Winner Caret Icon */}
            <div className="w-3 h-3 ml-1.5 flex items-center justify-center">
              {match.home.isWinner && (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                  <path d="M14 7l-5 5 5 5z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg leading-none">{match.away.flag}</span>
            <span className={`text-sm tracking-wide ${match.away.isWinner ? "text-white font-semibold" : "text-gray-300 font-normal"}`}>
              {match.away.name}
            </span>
          </div>
          <div className="flex items-center">
            <span className={`text-sm ${match.away.isWinner ? "text-white font-bold" : "text-gray-400"}`}>
              {match.away.score}
            </span>
            {/* Winner Caret Icon */}
            <div className="w-3 h-3 ml-1.5 flex items-center justify-center">
              {match.away.isWinner && (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                  <path d="M14 7l-5 5 5 5z" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function WorldCupBracketPage() {
  return (
    <main className="min-h-screen bg-[#0B0E14] text-white p-8 overflow-hidden font-sans">
      
      <div className="max-w-7xl mx-auto mb-10 mt-6">
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">FIFA World Cup 2026™</h1>
        <p className="text-gray-400 text-sm">Live knockout stage bracket and predictions.</p>
      </div>

      {/* Bracket Container - horizontally scrollable on small screens */}
      <div className="w-full overflow-x-auto pb-20 scrollbar-hide">
        <div className="min-w-[900px] flex justify-start items-stretch gap-0 max-w-7xl mx-auto">
          
          {/* Column 1: Quarterfinals */}
          <div className="flex flex-col gap-6 justify-around w-64 py-4">
            <MatchCard match={bracketData.quarterfinals[0]} />
            <MatchCard match={bracketData.quarterfinals[1]} />
            <MatchCard match={bracketData.quarterfinals[2]} />
            <MatchCard match={bracketData.quarterfinals[3]} />
          </div>

          {/* Connectors QF to SF */}
          <div className="flex flex-col justify-around w-12 py-4">
            {/* Top Connector */}
            <div className="h-[148px] border-r-2 border-t-2 border-b-2 border-white/10 rounded-r-xl w-full translate-y-[-10px] relative">
               {/* Horizontal line feeding into Semi 1 */}
               <div className="absolute top-1/2 right-[-24px] w-6 h-[2px] bg-white/10" />
            </div>
            {/* Bottom Connector */}
            <div className="h-[148px] border-r-2 border-t-2 border-b-2 border-white/10 rounded-r-xl w-full translate-y-[10px] relative">
               {/* Horizontal line feeding into Semi 2 */}
               <div className="absolute top-1/2 right-[-24px] w-6 h-[2px] bg-white/10" />
            </div>
          </div>

          {/* Column 2: Semifinals */}
          <div className="flex flex-col gap-8 justify-around w-64 px-6">
            <MatchCard match={bracketData.semifinals[0]} />
            <MatchCard match={bracketData.semifinals[1]} />
          </div>

          {/* Connectors SF to Final */}
          <div className="flex flex-col justify-center w-12 py-4 relative">
             {/* Center massive connector spanning the two semis */}
             <div className="h-[300px] border-r-2 border-t-2 border-b-2 border-white/10 rounded-r-xl w-full absolute top-1/2 -translate-y-1/2 left-0">
               {/* Horizontal line feeding into Final */}
               <div className="absolute top-1/2 right-[-24px] w-6 h-[2px] bg-white/10" />
             </div>
          </div>

          {/* Column 3: Final */}
          <div className="flex flex-col justify-center w-64 px-6">
            <MatchCard match={bracketData.finals[0]} />
          </div>

        </div>
      </div>
    </main>
  );
}