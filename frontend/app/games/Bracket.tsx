"use client";

import { useEffect, useState, useRef, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchPlayoffEligibleTeams, manualSeedBracket, fetchBracket } from '@/lib/api';
import { API_BASE_URL } from '@/lib/api';
import { Pencil } from 'lucide-react';

interface BracketProps {
  seasonId: number;
}

const Bracket = ({ seasonId }: BracketProps) => {
  const [bracket, setBracket] = useState<any>({});
  const [eligibleTeams, setEligibleTeams] = useState<any[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<(number | null)[]>(Array(12).fill(null));
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resultForms, setResultForms] = useState<{ [key: number]: { home_score: string, away_score: string } }>({});
  const [savingScore, setSavingScore] = useState<number | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const bracketRef = useRef<any>(null);

  useEffect(() => {
    console.log('Bracket: useEffect triggered with seasonId', seasonId);
    fetchBracket(seasonId)
      .then(data => {
        console.log('Bracket: fetchBracket success', data);
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
      })
      .catch(err => {
        console.error('Bracket: fetchBracket error', err);
        setError('Failed to load bracket');
      });

    fetchPlayoffEligibleTeams(seasonId)
      .then(data => {
        console.log('Bracket: fetchPlayoffEligibleTeams success', data);
        setEligibleTeams(data);
      })
      .catch(err => {
        console.error('Bracket: fetchPlayoffEligibleTeams error', err);
        setError('Failed to load eligible teams');
      });
  }, [seasonId]);

  // Pre-populate top 12 teams by final_rank if selectedTeams is all null and eligibleTeams is loaded
  useEffect(() => {
    if (
      eligibleTeams.length >= 12 &&
      selectedTeams.every((t) => t === null)
    ) {
      // Sort by final_rank (ascending, 1 is best)
      const sorted = [...eligibleTeams].sort((a, b) => {
        if (a.final_rank && b.final_rank) return a.final_rank - b.final_rank;
        if (a.final_rank) return -1;
        if (b.final_rank) return 1;
        return 0;
      });
      const top12 = sorted.slice(0, 12).map((t) => t.team_id);
      setSelectedTeams(top12);
    }
  }, [eligibleTeams]);

  const resetScoreInputsOnTeamChange = (newBracket: any, oldBracket: any, currentForms: any, changedGameId?: number) => {
    const updatedForms = { ...currentForms };
    
    Object.entries(newBracket).forEach(([roundKey, roundGames]: [string, any]) => {
      roundGames.forEach((game: any) => {
        // If this is the game that was just changed, clear its scores
        if (changedGameId && game.game_id === changedGameId) {
          delete updatedForms[game.game_id];
          return;
        }
        
        // Check if teams changed for this game
        const oldGame = oldBracket?.[roundKey]?.find((g: any) => g.game_id === game.game_id);
        if (oldGame) {
          const homeTeamChanged = oldGame.home_team_id !== game.home_team_id;
          const awayTeamChanged = oldGame.away_team_id !== game.away_team_id;
          
          if (homeTeamChanged || awayTeamChanged) {
            delete updatedForms[game.game_id];
          }
        }
      });
    });
    
    return updatedForms;
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

  const handleSaveAllForRound = async (roundKey: string) => {
    const roundGames = bracket[roundKey] || [];
    for (const game of roundGames) {
      if (game.home_team_id && game.away_team_id) {
        const home_score = resultForms[game.game_id]?.home_score;
        const away_score = resultForms[game.game_id]?.away_score;
        if (home_score && away_score) {
          await saveScoreAndAdvance(game, roundKey, roundGames.indexOf(game));
        }
      }
    }
  };

  const handleScoreChange = (gameId: number, field: 'home_score' | 'away_score', value: string) => {
    setResultForms(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [field]: value
      }
    }));
  };

  // Create team ID to seed mapping for display
  const teamIdToSeed: { [key: number]: number } = {};
  selectedTeams.forEach((teamId, index) => {
    if (teamId !== null) {
      teamIdToSeed[teamId] = index + 1;
    }
  });

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      {scoreError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {scoreError}
        </div>
      )}

      {/* Seeding Section */}
      <Card>
        <CardHeader>
          <CardTitle>Seed Bracket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="space-y-2">
                <label className="text-sm font-medium">Seed {i + 1}</label>
                <Select
                  value={selectedTeams[i]?.toString() || ''}
                  onValueChange={(value) => {
                    const newTeams = [...selectedTeams];
                    newTeams[i] = value ? Number(value) : null;
                    setSelectedTeams(newTeams);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleTeams.map((team) => {
                      // Disable if already selected in another seed
                      const isSelected = selectedTeams.includes(team.team_id) && selectedTeams[i] !== team.team_id;
                      return (
                        <SelectItem key={team.team_id} value={team.team_id.toString()} disabled={isSelected}>
                          {team.team_name} {team.final_rank && team.final_rank >= 1 && team.final_rank <= 25 ? `#${team.final_rank}` : '#NR'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <Button onClick={handleSeedBracket} disabled={seeding}>
            {seeding ? 'Seeding...' : 'Seed Bracket'}
          </Button>
        </CardContent>
      </Card>

      {/* Bracket Visualization */}
      <BracketVisual
        bracket={bracket}
        eligibleTeams={eligibleTeams}
        selectedTeams={selectedTeams}
        seeding={seeding}
        resultForms={resultForms}
        handleScoreChange={handleScoreChange}
        saveScoreAndAdvance={saveScoreAndAdvance}
        savingScore={savingScore}
        scoreError={scoreError}
        handleSaveAllForRound={handleSaveAllForRound}
      />
    </div>
  );
};

// Score Input Component
interface ScoreInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
}

const ScoreInput = ({ value, onChange, onEnter, disabled }: ScoreInputProps) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
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
};

interface BracketVisualProps {
  bracket: any;
  eligibleTeams: any[];
  selectedTeams: (number | null)[];
  seeding: boolean;
  resultForms: { [key: number]: { home_score: string, away_score: string } };
  handleScoreChange: (gameId: number, field: 'home_score' | 'away_score', value: string) => void;
  saveScoreAndAdvance: (game: any, round: string, idx: number) => void;
  savingScore: number | null;
  scoreError: string | null;
  handleSaveAllForRound: (roundKey: string) => void;
}

const BracketVisual = memo(function BracketVisual({
  bracket,
  eligibleTeams,
  selectedTeams,
  seeding,
  resultForms,
  handleScoreChange,
  saveScoreAndAdvance,
  savingScore,
  scoreError,
  handleSaveAllForRound
}: Omit<BracketVisualProps, 'handleAssignTeam'>) {
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  // Create team ID to seed mapping for display
  const teamIdToSeed: { [key: number]: number } = {};
  selectedTeams.forEach((teamId, index) => {
    if (teamId !== null) {
      teamIdToSeed[teamId] = index + 1;
    }
  });

  // Move getTeamInfo here
  function getTeamInfo(teamId: number | null | undefined, eligibleTeams: any[]) {
    if (!teamId) return null;
    return eligibleTeams.find(t => t.team_id === teamId) || null;
  }

  const rounds = [
    { key: 'First Round', title: 'First Round', week: 17 },
    { key: 'Quarterfinals', title: 'Quarterfinals', week: 18 },
    { key: 'Semifinals', title: 'Semifinals', week: 19 },
    { key: 'Championship', title: 'Championship', week: 20 }
  ];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max p-4">
        {rounds.map((round) => {
          const roundGames = bracket[round.key] || [];
          return (
            <div key={round.key} className="flex flex-col gap-4">
              <div className="text-center">
                <h3 className="font-bold text-lg mb-2">{round.title}</h3>
                <p className="text-sm text-gray-600">Week {round.week}</p>
                {roundGames.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveAllForRound(round.key)}
                    className="mt-2"
                  >
                    Save All Scores
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-4">
                {roundGames.map((game: any, idx: number) => {
                  const home = getTeamInfo(game.home_team_id, eligibleTeams);
                  const away = getTeamInfo(game.away_team_id, eligibleTeams);
                  const hasScore = game.home_score !== null && game.away_score !== null;
                  const isEditing = editingGameId === game.game_id;
                  return (
                    <div key={game.game_id} style={{ border: '1.5px solid #e0e7ef', borderRadius: 12, padding: 18, background: '#fff', minHeight: 70, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 8, transition: 'box-shadow 0.2s', position: 'relative' }}>
                      <div style={{ fontWeight: 500, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge variant="secondary" style={{ minWidth: 28, textAlign: 'center', fontSize: 13, padding: '2px 8px' }}>
                            {home ? (selectedTeams.findIndex((id) => id === home.team_id) !== -1 ? (selectedTeams.findIndex((id) => id === home.team_id) + 1) : '-') : '-'}
                          </Badge>
                          {home ? (
                            <>
                              {home.team_name}
                              <span style={{ marginLeft: 4, color: '#888', fontSize: 13 }}>
                                {home.final_rank && home.final_rank >= 1 && home.final_rank <= 25 ? `#${home.final_rank}` : '#NR'}
                              </span>
                            </>
                          ) : (
                            <span>TBD</span>
                          )}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge variant="secondary" style={{ minWidth: 28, textAlign: 'center', fontSize: 13, padding: '2px 8px' }}>
                            {away ? (selectedTeams.findIndex((id) => id === away.team_id) !== -1 ? (selectedTeams.findIndex((id) => id === away.team_id) + 1) : '-') : '-'}
                          </Badge>
                          {away ? (
                            <>
                              {away.team_name}
                              <span style={{ marginLeft: 4, color: '#888', fontSize: 13 }}>
                                {away.final_rank && away.final_rank >= 1 && away.final_rank <= 25 ? `#${away.final_rank}` : '#NR'}
                              </span>
                            </>
                          ) : (
                            <span>TBD</span>
                          )}
                        </span>
                      </div>
                      {/* Score Display/Input */}
                      {hasScore && !isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                          <span style={{ fontSize: 20, fontWeight: 700 }}>{game.home_score} - {game.away_score}</span>
                          <Button variant="ghost" size="icon" onClick={() => setEditingGameId(game.game_id)} style={{ marginLeft: 8 }} title="Edit Score">
                            <Pencil size={18} />
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12, color: '#666' }}>H:</span>
                            <ScoreInput
                              value={resultForms[game.game_id]?.home_score ?? ''}
                              onChange={(value) => handleScoreChange(game.game_id, 'home_score', value)}
                              disabled={savingScore === game.game_id}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12, color: '#666' }}>A:</span>
                            <ScoreInput
                              value={resultForms[game.game_id]?.away_score ?? ''}
                              onChange={(value) => handleScoreChange(game.game_id, 'away_score', value)}
                              onEnter={() => saveScoreAndAdvance(game, round.key, idx)}
                              disabled={savingScore === game.game_id}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => { saveScoreAndAdvance(game, round.key, idx); setEditingGameId(null); }}
                            disabled={savingScore === game.game_id || !resultForms[game.game_id]?.home_score || !resultForms[game.game_id]?.away_score}
                            style={{ fontSize: 12, padding: '4px 8px' }}
                          >
                            {savingScore === game.game_id ? 'Saving...' : 'Save'}
                          </Button>
                          {hasScore && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingGameId(null)}
                              style={{ marginLeft: 4 }}
                              title="Cancel Edit"
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default Bracket; 