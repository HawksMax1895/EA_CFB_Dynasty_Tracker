"use client";

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { fetchPlayoffEligibleTeams, manualSeedBracket, fetchBracket, API_BASE_URL } from '../../../../lib/api';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';

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
  const [resultForms, setResultForms] = useState<{ [key: number]: { home_score: string, away_score: string } }>({});
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
          // Only clear if the scores haven't been saved yet (i.e., they're in resultForms but not in the game data)
          const hasUnsavedChanges = updatedScoreInputs[game.game_id] && 
            (updatedScoreInputs[game.game_id].home_score !== (game.home_score?.toString() || '') ||
             updatedScoreInputs[game.game_id].away_score !== (game.away_score?.toString() || ''));
          if (hasUnsavedChanges) {
            updatedScoreInputs[game.game_id] = { home_score: '', away_score: '' };
          }
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
          
          // Initialize resultForms with existing scores from the backend
          const initialResultForms: { [key: number]: { home_score: string, away_score: string } } = {};
          Object.values(data).forEach((roundGames: any) => {
            roundGames.forEach((game: any) => {
              if (game.home_score !== null && game.away_score !== null) {
                initialResultForms[game.game_id] = {
                  home_score: game.home_score.toString(),
                  away_score: game.away_score.toString()
                };
              }
            });
          });
          setResultForms(initialResultForms);
          
          // Reset scoreInputs for games where teams changed
          setResultForms(prev => resetScoreInputsOnTeamChange(data, bracketRef.current, prev));
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
          setResultForms(prev => resetScoreInputsOnTeamChange(data, bracketRef.current, prev, gameId));
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
    const home_score = resultForms[game.game_id]?.home_score !== undefined && resultForms[game.game_id]?.home_score !== ''
      ? resultForms[game.game_id].home_score
      : (game.home_score !== null && game.home_score !== undefined ? game.home_score : '');
    const away_score = resultForms[game.game_id]?.away_score !== undefined && resultForms[game.game_id]?.away_score !== ''
      ? resultForms[game.game_id].away_score
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
      
      setSuccess('Score saved!');
      setTimeout(() => setSuccess(null), 1000);
      
      // Refetch the bracket after a successful save to get updated reseeding
      fetchBracket(seasonId)
        .then(data => {
          console.log('Bracket data after save:', data); // Debug log
          setBracket(data);
          setResultForms(prev => resetScoreInputsOnTeamChange(data, bracketRef.current, prev, game.game_id));
          bracketRef.current = data;
        });
    } catch (e) {
      setScoreError('Failed to save score.');
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
        setResultForms(prev => resetScoreInputsOnTeamChange(data, bracketRef.current, prev));
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

  const handleScoreBlur = async (game: any) => {
    const home_score = resultForms[game.game_id]?.home_score;
    const away_score = resultForms[game.game_id]?.away_score;
    
    // Only save if both scores are provided and valid
    if (home_score && away_score && !isNaN(Number(home_score)) && !isNaN(Number(away_score))) {
      setSavingScore(game.game_id);
      setScoreError(null);
      try {
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
        setSuccess('Score saved!');
        setTimeout(() => setSuccess(null), 2000);
        // Refetch the bracket after a successful save
        fetchBracket(Number(seasonId)).then(data => {
          setBracket(data);
          bracketRef.current = data;
          // If this was a semifinal, check if all semifinals are complete and refetch again to show the final
          if (game.playoff_round === 'Semifinals') {
            const semis = (data['Semifinals'] || []);
            const allSemisComplete = semis.length === 2 && semis.every((g: any) => g.home_score !== null && g.away_score !== null);
            if (allSemisComplete) {
              fetchBracket(Number(seasonId)).then(newData => {
                setBracket(newData);
                bracketRef.current = newData;
              });
            }
          }
        });
      } catch (e) {
        setScoreError('Failed to save score.');
      } finally {
        setSavingScore(null);
      }
    }
  };

  // Score input change handler (matches schedule & result tab)
  const handleScoreChange = (game: any, team: 'home' | 'away', value: string) => {
    setResultForms(prev => ({
      ...prev,
      [game.game_id]: {
        ...prev[game.game_id],
        [`${team}_score`]: value,
        // Ensure both fields are always present
        ...(team === 'home'
          ? { away_score: prev[game.game_id]?.away_score ?? (game.away_score ?? '') }
          : { home_score: prev[game.game_id]?.home_score ?? (game.home_score ?? '') })
      }
    }));
  };

  // Save all scores for a round in one batch (matches schedule & result tab)
  const handleSaveAllForRound = async (roundKey: string) => {
    const games = (bracket?.[roundKey] || []);
    const results = games.map((game: any) => ({
      game_id: game.game_id,
      home_score: Number(resultForms[game.game_id]?.home_score ?? game.home_score ?? ''),
      away_score: Number(resultForms[game.game_id]?.away_score ?? game.away_score ?? ''),
      playoff_round: game.playoff_round
    })).filter(r => !isNaN(r.home_score) && !isNaN(r.away_score));
    
    console.log('Saving scores for round:', roundKey);
    console.log('Games in round:', games);
    console.log('Result forms:', resultForms);
    console.log('Results to send:', results);
    
    if (results.length === 0) {
      console.log('No valid results to save');
      return;
    }
    
    setSavingScore(-1);
    setScoreError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/playoff/${seasonId}/batch-playoff-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('Backend response:', responseData);
      
      setSuccess('Scores saved!');
      setTimeout(() => setSuccess(null), 2000);
      fetchBracket(Number(seasonId)).then(data => {
        console.log('Bracket after save:', data);
        setBracket(data);
        bracketRef.current = data;
        // If this was the semifinals, check if all semifinals are complete and refetch again to show the final
        if (roundKey === 'Semifinals') {
          const semis = (data['Semifinals'] || []);
          const allSemisComplete = semis.length === 2 && semis.every((g: any) => g.home_score !== null && g.away_score !== null);
          console.log('Semifinals complete check:', { semis, allSemisComplete });
          if (allSemisComplete) {
            fetchBracket(Number(seasonId)).then(newData => {
              console.log('Bracket after semifinal completion:', newData);
              setBracket(newData);
              bracketRef.current = newData;
            });
          }
        }
      });
    } catch (e) {
      console.error('Error saving scores:', e);
      setScoreError('Failed to save scores.');
    } finally {
      setSavingScore(null);
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

interface BracketVisualProps {
  bracket: any;
  eligibleTeams: any[];
  selectedTeams: (number | null)[];
  seeding: boolean;
  handleAssignTeam: (gameId: number, slot: 'home' | 'away', teamId: number) => void;
  resultForms: { [key: number]: { home_score: string, away_score: string } };
  handleScoreChange: (game: any, team: 'home' | 'away', value: string) => void;
  savingScore: number | null;
  scoreError: string | null;
  handleScoreBlur: (game: any) => void;
}

const BracketVisual = memo(function BracketVisual({
  bracket,
  eligibleTeams,
  selectedTeams,
  seeding,
  handleAssignTeam,
  resultForms,
  handleScoreChange,
  savingScore,
  scoreError,
  handleScoreBlur,
}: BracketVisualProps) {
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
                    {(() => {
                      if (!game.away_team_id) return '';
                      const seedIdx = selectedTeams.findIndex((id: number | null) => id === game.away_team_id);
                      return seedIdx !== -1 ? ` (${seedIdx + 1})` : '';
                    })()}
                  </div>
                  {home && away && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Input
                        type="number"
                        placeholder="Home Score"
                        value={resultForms[game.game_id]?.home_score !== undefined 
                          ? resultForms[game.game_id].home_score 
                          : (game.home_score !== null ? game.home_score.toString() : '')}
                        onChange={e => handleScoreChange(game, 'home', e.target.value)}
                        onBlur={() => handleScoreBlur(game)}
                        className="w-20 text-center text-lg font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors"
                        disabled={savingScore === game.game_id}
                      />
                      <span>:</span>
                      <Input
                        type="number"
                        placeholder="Away Score"
                        value={resultForms[game.game_id]?.away_score !== undefined 
                          ? resultForms[game.game_id].away_score 
                          : (game.away_score !== null ? game.away_score.toString() : '')}
                        onChange={e => handleScoreChange(game, 'away', e.target.value)}
                        onBlur={() => handleScoreBlur(game)}
                        className="w-20 text-center text-lg font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors"
                        disabled={savingScore === game.game_id}
                      />
                      {savingScore === game.game_id && (
                        <span style={{ fontSize: 12, color: '#64748b' }}>Saving...</span>
                      )}
                    </div>
                  )}
                  {scoreError && <div style={{ color: 'red', marginTop: 4 }}>{scoreError}</div>}
                </div>
              );
            })}
            {/* Save All button for this round */}
            <button
              onClick={() => handleSaveAllForRound(round.key)}
              style={{ marginTop: 16, alignSelf: 'flex-end', padding: '6px 18px', borderRadius: 6, background: '#2563eb', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 15 }}
            >
              Save All
            </button>
          </div>
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
      
      {/* Seeding Interface */}
      {(!bracket || Object.keys(bracket).length === 0) && (
        <div style={{ marginBottom: 24, padding: 24, background: '#f8fafc', borderRadius: 12, border: '2px dashed #cbd5e1' }}>
          <h2 style={{ marginBottom: 16 }}>Seed the Bracket</h2>
          <p style={{ marginBottom: 16, color: '#64748b' }}>Select teams for each seed (1-12) to create the playoff bracket.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge variant="secondary" style={{ minWidth: 32, textAlign: 'center' }}>
                  {i + 1}
                </Badge>
                <select
                  value={selectedTeams[i] ?? ''}
                  onChange={e => handleSelectTeam(i, Number(e.target.value))}
                  style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                >
                  <option value="">Select Team</option>
                  {eligibleTeams.map((team: any) => {
                    const isSelected = selectedTeams.includes(team.team_id);
                    return (
                      <option key={team.team_id} value={team.team_id} disabled={isSelected && selectedTeams[i] !== team.team_id}>
                        {`${team.team_name} ${team.final_rank && team.final_rank >= 1 && team.final_rank <= 25 ? `#${team.final_rank}` : '#NR'}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={handleSeedBracket}
            disabled={seeding || selectedTeams.some(t => t === null)}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              background: seeding || selectedTeams.some(t => t === null) ? '#94a3b8' : '#2563eb',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: seeding || selectedTeams.some(t => t === null) ? 'not-allowed' : 'pointer',
              fontSize: 16
            }}
          >
            {seeding ? 'Seeding...' : 'Seed Bracket'}
          </button>
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
        </div>
      )}

      {/* Bracket Controls */}
      {bracket && Object.keys(bracket).length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            onClick={handleRefreshBracket} 
            style={{ 
              padding: '8px 16px', 
              borderRadius: 6, 
              background: '#64748b', 
              color: '#fff', 
              fontWeight: 600, 
              border: 'none', 
              cursor: 'pointer' 
            }}
          >
            Refresh Bracket
          </button>
          {success && <div style={{ color: 'green', fontWeight: 500 }}>{success}</div>}
          {error && <div style={{ color: 'red', fontWeight: 500 }}>{error}</div>}
        </div>
      )}

      {/* Bracket display */}
      <BracketVisual
        bracket={bracket}
        eligibleTeams={eligibleTeams}
        selectedTeams={selectedTeams}
        seeding={seeding}
        handleAssignTeam={handleAssignTeam}
        resultForms={resultForms}
        handleScoreChange={handleScoreChange}
        savingScore={savingScore}
        scoreError={scoreError}
        handleScoreBlur={handleScoreBlur}
      />
    </div>
  );
} 