"use client";

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { fetchPlayoffEligibleTeams, manualSeedBracket, fetchBracket, API_BASE_URL } from '../../../../lib/api';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import React from 'react';

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

  // Handle Enter key to save
  const handleScoreKeyDown = (e: React.KeyboardEvent, game: any, round: string, idx: number) => {
    if (e.key === 'Enter') {
      saveScoreAndAdvance(game, round, idx);
    }
  };

  // Score input change handler (matches schedule & result tab)
  const handleScoreChange = (game: any, team: 'home' | 'away', value: string) => {
    setResultForms(prev => {
      const currentForm = prev[game.game_id] || {};
      const newForm = {
        ...currentForm,
        [`${team}_score`]: value,
        // Ensure both fields are always present
        ...(team === 'home'
          ? { away_score: currentForm.away_score ?? (game.away_score ?? '') }
          : { home_score: currentForm.home_score ?? (game.home_score ?? '') })
      };
      
      // Only update if the value actually changed
      if (currentForm[`${team}_score`] === value) {
        return prev;
      }
      
      return {
        ...prev,
        [game.game_id]: newForm
      };
    });
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

  // Reusable score input that maintains its own internal state to avoid focus loss on re-renders
  function ScoreInput({
    value,
    onChange,
    disabled,
    onEnter,
  }: {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    onEnter?: () => void;
  }) {
    const [local, setLocal] = React.useState<string>(value);

    // Keep local state in sync when the prop value changes externally (e.g., after save or reset)
    React.useEffect(() => {
      setLocal(value);
    }, [value]);

    return (
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={local}
        placeholder="Score"
        disabled={disabled}
        className="w-20 text-center text-lg font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors"
        onChange={(e) => {
          const v = e.target.value;
          // Accept only digits (optional empty) client-side
          if (/^\d*$/.test(v)) {
            setLocal(v);
            onChange(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter();
        }}
      />
    );
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
  handleSaveAllForRound: (roundKey: string) => void;
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
  handleSaveAllForRound,
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
                  </div>
                  {(home && away) && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                      <ScoreInput
                        value={resultForms[game.game_id]?.home_score ?? (game.home_score ?? '')}
                        onChange={(v) => handleScoreChange(game, 'home', v)}
                        disabled={savingScore !== null}
                        onEnter={() => saveScoreAndAdvance(game, round.key, idx)}
                      />
                      <ScoreInput
                        value={resultForms[game.game_id]?.away_score ?? (game.away_score ?? '')}
                        onChange={(v) => handleScoreChange(game, 'away', v)}
                        disabled={savingScore !== null}
                        onEnter={() => saveScoreAndAdvance(game, round.key, idx)}
                      />
                    </div>
                  )}
                  {i < rounds.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        right: -30,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 20,
                        height: 2,
                        backgroundColor: '#d1d5db'
                      }}
                    />
                  )}
                  {i > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: -30,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 20,
                        height: 2,
                        backgroundColor: '#d1d5db'
                      }}
                    />
                  )}
                  {savingScore === game.game_id && (
                    <div style={{ fontSize: 13, color: 'blue', marginTop: 4, textAlign: 'right' }}>Saving...</div>
                  )}
                  {scoreError && (
                    <div style={{ fontSize: 13, color: 'red', marginTop: 4, textAlign: 'right' }}>{scoreError}</div>
                  )}
                  {i < rounds.length - 1 && (bracket[rounds[i + 1].key] || []).find((nextGame: any) =>
                    (idx === 0 && (nextGame.home_team_id === game.home_team_id || nextGame.home_team_id === game.away_team_id)) ||
                    (idx === 1 && (nextGame.home_team_id === game.home_team_id || nextGame.home_team_id === game.away_team_id))
                  ) && (
                      <div
                        style={{
                          position: 'absolute',
                          right: -30,
                          top: '50%',
                          height: (32 + 70) * (Math.pow(2, i) / 2),
                          borderRight: '2px solid #d1d5db',
                          borderTop: i === 0 || i === 1 ? '2px solid #d1d5db' : 'none',
                          borderBottom: i === 0 || i === 1 ? '2px solid #d1d5db' : 'none',
                          width: 10,
                          zIndex: -1,
                        }}
                      />
                    )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => handleSaveAllForRound(round.key)}
              disabled={savingScore !== null}
              className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Save {round.label} Scores
            </button>
          </div>
        </div>
      ))}
    </div>
  );
});

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 16 }}>{success}</div>}
      
      {!bracket || Object.keys(bracket).every(r => bracket[r].length === 0) ? (
        <div style={{ padding: 24, background: '#f9fafb', borderRadius: 8 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Seed the Playoff Bracket</h3>
          <p style={{ marginBottom: 20, color: '#6b7280' }}>Select the top 12 teams for the playoff bracket.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge variant="secondary" style={{ minWidth: 32, textAlign: 'center', fontSize: 14 }}>{i + 1}</Badge>
                <select
                  value={selectedTeams[i] ?? ''}
                  onChange={e => handleSelectTeam(i, Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
                >
                  <option value="">Select Team</option>
                  {eligibleTeams.map(team => (
                    <option key={team.team_id} value={team.team_id} disabled={selectedTeams.includes(team.team_id) && selectedTeams[i] !== team.team_id}>
                      {team.team_name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button onClick={handleSeedBracket} disabled={seeding} style={{ marginTop: 24, padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: seeding ? 0.6 : 1 }}>
            {seeding ? 'Seeding...' : 'Seed Bracket'}
          </button>
        </div>
      ) : (
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
          handleSaveAllForRound={handleSaveAllForRound}
        />
      )}
    </>
  );
} 