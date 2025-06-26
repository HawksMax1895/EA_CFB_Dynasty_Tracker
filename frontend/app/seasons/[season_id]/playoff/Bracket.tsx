import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { fetchPlayoffEligibleTeams, manualSeedBracket, fetchBracket, API_BASE_URL } from '../../../../lib/api';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';

function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

interface BracketProps {
  seasonId: number | string;
}

export default function Bracket({ seasonId }: BracketProps) {
  const [bracket, setBracket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eligibleTeams, setEligibleTeams] = useState<any[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<(number | null)[]>(Array(12).fill(null));
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<{ [gameId: number]: { home: string; away: string } }>({});
  const [savingScore, setSavingScore] = useState<number | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const bracketRef = useRef<any>(null);

  // Helper to reset scoreInputs for games where teams changed
  function resetScoreInputsOnTeamChange(newBracket: any, prevBracket: any, prevScoreInputs: any, preserveGameId?: number) {
    const updatedScoreInputs = { ...prevScoreInputs };
    const rounds = ['First Round', 'Quarterfinals', 'Semifinals', 'Championship'];
    for (const round of rounds) {
      if (!newBracket[round] || !prevBracket?.[round]) continue;
      newBracket[round].forEach((game: any, idx: number) => {
        const prevGame = prevBracket[round][idx];
        if (!prevGame) return;
        if (
          game.home_team_id !== prevGame.home_team_id ||
          game.away_team_id !== prevGame.away_team_id
        ) {
          if (preserveGameId && game.game_id === preserveGameId) return;
          updatedScoreInputs[game.game_id] = { home: '', away: '' };
        }
      });
    }
    return updatedScoreInputs;
  }

  // Fetch bracket
  useEffect(() => {
    if (seasonId) {
      setLoading(true);
      fetchBracket(Number(seasonId))
        .then(data => {
          console.log('Bracket data after save:', data); // Debug log
          setBracket(data);
          // Reset scoreInputs for games where teams changed
          setScoreInputs(prev => resetScoreInputsOnTeamChange(data, bracketRef.current, prev));
          bracketRef.current = data;
          setLoading(false);
        });
    }
  }, [seasonId, seeding]);

  // Fetch eligible teams
  useEffect(() => {
    if (seasonId) {
      fetchPlayoffEligibleTeams(Number(seasonId))
        .then(setEligibleTeams)
        .catch(() => setEligibleTeams([]));
    }
  }, [seasonId]);

  const handleSelectTeam = (seedIdx: number, teamId: number) => {
    setSelectedTeams(prev => {
      const updated = [...prev];
      updated[seedIdx] = teamId;
      return updated;
    });
  };

  const handleSeedBracket = async () => {
    setError(null);
    setSuccess(null);
    if (selectedTeams.some(t => t === null)) {
      setError('Please select a team for every seed.');
      return;
    }
    // Check for duplicates
    const unique = new Set(selectedTeams);
    if (unique.size !== 12) {
      setError('Each team must be selected only once.');
      return;
    }
    setSeeding(true);
    try {
      await manualSeedBracket(Number(seasonId), selectedTeams as number[]);
      setSuccess('Bracket seeded successfully!');
      setTimeout(() => setSuccess(null), 2000);
      fetchBracket(seasonId)
        .then(data => {
          setBracket(data);
          bracketRef.current = data;
        });
    } catch (e) {
      setError('Failed to seed bracket.');
    } finally {
      setSeeding(false);
    }
  };

  const handleAssignTeam = async (gameId: number, slot: 'home' | 'away', teamId: number) => {
    setSeeding(true);
    setError(null);
    try {
      await fetch(`${API_BASE_URL}/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`${slot}_team_id`]: teamId })
      });
      fetchBracket(Number(seasonId))
        .then(data => {
          setBracket(data);
          setScoreInputs(prev => resetScoreInputsOnTeamChange(data, bracketRef.current, prev, gameId));
          bracketRef.current = data;
        });
    } catch (e) {
      setError('Failed to assign team.');
    } finally {
      setSeeding(false);
    }
  };

  function getTeamInfo(teamId: number | null | undefined, eligibleTeams: any[]) {
    if (!teamId) return null;
    return eligibleTeams.find(t => t.team_id === teamId) || null;
  }

  function getNextGameAndSlot(round: string, idx: number) {
    if (round === 'First Round') {
      const qfIdx = 3 - idx;
      return { nextRound: 'Quarterfinals', nextIdx: qfIdx, slot: 'away' };
    }
    if (round === 'Quarterfinals') {
      if (idx === 0) return { nextRound: 'Semifinals', nextIdx: 0, slot: 'home' };
      if (idx === 1) return { nextRound: 'Semifinals', nextIdx: 1, slot: 'home' };
      if (idx === 2) return { nextRound: 'Semifinals', nextIdx: 1, slot: 'away' };
      if (idx === 3) return { nextRound: 'Semifinals', nextIdx: 0, slot: 'away' };
    }
    if (round === 'Semifinals') {
      if (idx === 0) return { nextRound: 'Championship', nextIdx: 0, slot: 'home' };
      if (idx === 1) return { nextRound: 'Championship', nextIdx: 0, slot: 'away' };
    }
    return null;
  }

  // Save score and advance winner
  const saveScoreAndAdvance = async (game: any, round: string, idx: number) => {
    setSavingScore(game.game_id);
    setScoreError(null);
    const home_score = scoreInputs[game.game_id]?.home !== undefined && scoreInputs[game.game_id]?.home !== ''
      ? scoreInputs[game.game_id].home
      : (game.home_score !== null && game.home_score !== undefined ? game.home_score : '');
    const away_score = scoreInputs[game.game_id]?.away !== undefined && scoreInputs[game.game_id]?.away !== ''
      ? scoreInputs[game.game_id].away
      : (game.away_score !== null && game.away_score !== undefined ? game.away_score : '');
    if (
      home_score === '' ||
      away_score === '' ||
      game.home_team_id == null ||
      game.away_team_id == null
    ) {
      setScoreError('Both scores are required.');
      setSavingScore(null);
      return;
    }
    try {
      console.log('Sending POST request to save playoff result', { home_score, away_score });
      await fetch(`${API_BASE_URL}/playoff/${seasonId}/playoff-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: game.game_id,
          home_score: Number(home_score),
          away_score: Number(away_score),
          playoff_round: game.playoff_round
        })
      });
      // Advance winner logic (unchanged)
      const winner = Number(home_score) > Number(away_score) ? game.home_team_id : game.away_team_id;
      const next = getNextGameAndSlot(round, idx);
      const bracket = bracketRef.current;
      if (next && bracket && bracket[next.nextRound] && bracket[next.nextRound][next.nextIdx]) {
        const nextGame = bracket[next.nextRound][next.nextIdx];
        if (!nextGame[next.slot + '_team_id']) {
          await fetch(`${API_BASE_URL}/games/${nextGame.game_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [`${next.slot}_team_id`]: winner })
          });
        }
      }
      setSuccess('Score saved!');
      setTimeout(() => setSuccess(null), 1000);
      // Refetch the bracket after a successful save
      fetchBracket(seasonId)
        .then(data => {
          console.log('Bracket data after save:', data); // Debug log
          setBracket(data);
          setScoreInputs(prev => resetScoreInputsOnTeamChange(data, bracketRef.current, prev, game.game_id));
          bracketRef.current = data;
          // Optionally, restore focus here using a ref if needed
        });
    } catch (e) {
      setScoreError('Failed to save score or advance winner.');
    } finally {
      setSavingScore(null);
    }
  };

  // Add a manual refresh button for the bracket
  const handleRefreshBracket = async () => {
    setLoading(true);
    fetchBracket(Number(seasonId))
      .then(data => {
        setBracket(data);
        setScoreInputs(prev => resetScoreInputsOnTeamChange(data, bracketRef.current, prev));
        bracketRef.current = data;
        setLoading(false);
      });
  };

  // Handle Enter key to save
  const handleScoreKeyDown = (e: React.KeyboardEvent, game: any, round: string, idx: number) => {
    if (e.key === 'Enter') {
      saveScoreAndAdvance(game, round, idx);
    }
  };

  // Add this function to handle score input changes
  const handleScoreChange = (game: any, round: string, idx: number, team: 'home' | 'away', value: string) => {
    // Only allow numeric input (empty string is allowed for clearing)
    if (/^\d*$/.test(value)) {
      setScoreInputs(prev => ({
        ...prev,
        [game.game_id]: {
          ...prev[game.game_id],
          [team]: value
        }
      }));
    }
  };

  // Build a map from team_id to playoff seed using the First Round
  function getTeamIdToSeed(bracket: any) {
    const map: Record<number, number> = {};
    if (bracket && bracket['First Round']) {
      // 5 vs 12, 6 vs 11, 7 vs 10, 8 vs 9
      const seeds = [5, 6, 7, 8, 12, 11, 10, 9];
      bracket['First Round'].forEach((game: any, idx: number) => {
        // Home team gets lower seed in each matchup
        if (game.home_team_id) map[game.home_team_id] = seeds[idx];
        if (game.away_team_id) map[game.away_team_id] = seeds[4 + idx];
      });
    }
    // Quarterfinals: 1, 2, 3, 4 are top seeds
    if (bracket && bracket['Quarterfinals']) {
      [1, 2, 3, 4].forEach((seed, idx) => {
        const game = bracket['Quarterfinals'][idx];
        if (game && game.home_team_id) map[game.home_team_id] = seed;
      });
    }
    return map;
  }

  const BracketVisual = memo(function BracketVisual({ bracket, eligibleTeams, scoreInputs, handleScoreChange, savingScore, scoreError, saveScoreAndAdvance, handleScoreKeyDown }: any) {
    console.log('BracketVisual render, bracket:', bracket);
    if (!bracket || Object.keys(bracket).length === 0) return null;
    const rounds = [
      { key: 'First Round', label: 'First Round' },
      { key: 'Quarterfinals', label: 'Quarterfinals' },
      { key: 'Semifinals', label: 'Semifinals' },
      { key: 'Championship', label: 'Championship' },
    ];
    const teamIdToSeed = getTeamIdToSeed(bracket);
    return (
      <div className="bracket-visual" style={{ display: 'flex', gap: 40, marginTop: 32, overflowX: 'auto', padding: 24, background: '#f5f7fa', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        {rounds.map((round, i) => (
          <div key={round.key} style={{ minWidth: 220, position: 'relative' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 12, fontSize: 18, letterSpacing: 0.5 }}>{round.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {[...(bracket[round.key] || [])].sort((a, b) => a.game_id - b.game_id).map((game: any, idx: number) => {
                const home = getTeamInfo(game.home_team_id, eligibleTeams);
                const away = getTeamInfo(game.away_team_id, eligibleTeams);
                const isFirstRound = round.key === 'First Round';
                const isQuarterfinalsHome = round.key === 'Quarterfinals' && idx >= 0 && idx < 4;
                return (
                  <div key={game.game_id} style={{ border: '1.5px solid #e0e7ef', borderRadius: 12, padding: 18, background: '#fff', minHeight: 70, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 8, transition: 'box-shadow 0.2s', position: 'relative' }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {(isFirstRound || isQuarterfinalsHome) ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge variant="secondary" style={{ minWidth: 28, textAlign: 'center', fontSize: 13, padding: '2px 8px' }}>
                            {game.home_team_id ? (teamIdToSeed[game.home_team_id] ?? '-') : '-'}
                          </Badge>
                          <select
                            value={game.home_team_id ?? ''}
                            onChange={e => handleAssignTeam(game.game_id, 'home', Number(e.target.value))}
                            disabled={seeding}
                          >
                            <option value="">Assign Home Team</option>
                            {eligibleTeams.filter((t: any) => t.team_id !== game.away_team_id).map((team: any) => {
                              // Collect all assigned team IDs in this round except for the current slot
                              const assignedTeamIds = (bracket[round.key] || [])
                                .filter((g: any) => g.game_id !== game.game_id)
                                .flatMap((g: any) => [g.home_team_id, g.away_team_id])
                                .filter((id: any) => id !== null && id !== undefined);
                              const isAssigned = assignedTeamIds.includes(team.team_id);
                              return (
                                <option key={team.team_id} value={team.team_id} disabled={isAssigned}>
                                  {`${team.team_name} ${team.final_rank && team.final_rank >= 1 && team.final_rank <= 25 ? `#${team.final_rank}` : '#NR'}`}
                                </option>
                              );
                            })}
                          </select>
                        </span>
                      ) : home ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge variant="secondary" style={{ minWidth: 28, textAlign: 'center', fontSize: 13, padding: '2px 8px' }}>
                            {teamIdToSeed[home.team_id] ?? '-'}
                          </Badge>
                          {home.team_name}
                          <span style={{ marginLeft: 4, color: '#888', fontSize: 13 }}>
                            {home.final_rank && home.final_rank >= 1 && home.final_rank <= 25 ? `#${home.final_rank}` : '#NR'}
                          </span>
                        </span>
                      ) : (
                        <span>TBD</span>
                      )}
                      {/* Show seed rank if available */}
                      {(() => {
                        if (!game.home_team_id) return '';
                        const seedIdx = selectedTeams.findIndex((id: number | null) => id === game.home_team_id);
                        return seedIdx !== -1 ? ` (${seedIdx + 1})` : '';
                      })()}
                    </div>
                    <div style={{ fontWeight: 500 }}>
                      {isFirstRound ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge variant="secondary" style={{ minWidth: 28, textAlign: 'center', fontSize: 13, padding: '2px 8px' }}>
                            {game.away_team_id ? (teamIdToSeed[game.away_team_id] ?? '-') : '-'}
                          </Badge>
                          <select
                            value={game.away_team_id ?? ''}
                            onChange={e => handleAssignTeam(game.game_id, 'away', Number(e.target.value))}
                            disabled={seeding}
                          >
                            <option value="">Assign Away Team</option>
                            {eligibleTeams.filter((t: any) => t.team_id !== game.home_team_id).map((team: any) => {
                              // Collect all assigned team IDs in this round except for the current slot
                              const assignedTeamIds = (bracket[round.key] || [])
                                .filter((g: any) => g.game_id !== game.game_id)
                                .flatMap((g: any) => [g.home_team_id, g.away_team_id])
                                .filter((id: any) => id !== null && id !== undefined);
                              const isAssigned = assignedTeamIds.includes(team.team_id);
                              return (
                                <option key={team.team_id} value={team.team_id} disabled={isAssigned}>
                                  {`${team.team_name} ${team.final_rank && team.final_rank >= 1 && team.final_rank <= 25 ? `#${team.final_rank}` : '#NR'}`}
                                </option>
                              );
                            })}
                          </select>
                        </span>
                      ) : away ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge variant="secondary" style={{ minWidth: 28, textAlign: 'center', fontSize: 13, padding: '2px 8px' }}>
                            {teamIdToSeed[away.team_id] ?? '-'}
                          </Badge>
                          {away.team_name}
                          <span style={{ marginLeft: 4, color: '#888', fontSize: 13 }}>
                            {away.final_rank && away.final_rank >= 1 && away.final_rank <= 25 ? `#${away.final_rank}` : '#NR'}
                          </span>
                        </span>
                      ) : (
                        <span>TBD</span>
                      )}
                      {/* Show seed rank if available */}
                      {(() => {
                        if (!game.away_team_id) return '';
                        const seedIdx = selectedTeams.findIndex((id: number | null) => id === game.away_team_id);
                        return seedIdx !== -1 ? ` (${seedIdx + 1})` : '';
                      })()}
                    </div>
                    {/* Score input fields */}
                    {home && away && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Home Score"
                          value={scoreInputs[game.game_id]?.home ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleScoreChange(game, round.key, idx, 'home', e.target.value)}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleScoreKeyDown(e, game, round.key, idx)}
                          className="w-16 text-center text-base font-semibold border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                        />
                        <span>:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Away Score"
                          value={scoreInputs[game.game_id]?.away ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleScoreChange(game, round.key, idx, 'away', e.target.value)}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleScoreKeyDown(e, game, round.key, idx)}
                          className="w-16 text-center text-base font-semibold border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                        />
                        <button
                          onClick={() => saveScoreAndAdvance(game, round.key, idx)}
                          disabled={savingScore === game.game_id}
                          style={{ marginLeft: 8, padding: '6px 16px', borderRadius: 6, background: savingScore === game.game_id ? '#e0e7ef' : '#2563eb', color: '#fff', fontWeight: 600, border: 'none', cursor: savingScore === game.game_id ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                        >
                          {savingScore === game.game_id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                    {scoreError && <div style={{ color: 'red', marginTop: 4 }}>{scoreError}</div>}
                  </div>
                );
              })}
            </div>
            {/* Vertical line for round connection */}
            {i < rounds.length - 1 && (
              <div style={{ position: 'absolute', right: -20, top: 0, bottom: 0, width: 4, background: 'linear-gradient(to bottom, #e0e7ef 60%, transparent 100%)', borderRadius: 2, zIndex: 0 }} />
            )}
          </div>
        ))}
      </div>
    );
  });

  if (loading) return <div>Loading bracket...</div>;

  return (
    <div>
      <h1>12-Team Playoff Bracket</h1>
      <button onClick={handleRefreshBracket} style={{ marginBottom: 16 }}>Refresh Bracket</button>
      {/* Bracket display */}
      <BracketVisual
        bracket={bracket}
        eligibleTeams={eligibleTeams}
        scoreInputs={scoreInputs}
        handleScoreChange={handleScoreChange}
        savingScore={savingScore}
        scoreError={scoreError}
        saveScoreAndAdvance={saveScoreAndAdvance}
        handleScoreKeyDown={handleScoreKeyDown}
      />
    </div>
  );
} 