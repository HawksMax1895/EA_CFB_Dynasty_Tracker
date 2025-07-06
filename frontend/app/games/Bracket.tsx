"use client";

import { useEffect, useState, useRef, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchPlayoffEligibleTeams, manualSeedBracket, fetchBracket } from '@/lib/api';
import { API_BASE_URL } from '@/lib/api';
import { Pencil } from 'lucide-react';
import type { BracketData, PlayoffEligibleTeam, Game } from '@/types';

interface BracketProps {
  seasonId: number;
}

const Bracket = ({ seasonId }: BracketProps) => {
  const [bracket, setBracket] = useState<BracketData>({});
  const [eligibleTeams, setEligibleTeams] = useState<PlayoffEligibleTeam[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<(number | null)[]>(Array(12).fill(null));
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resultForms, setResultForms] = useState<{ [key: number]: { home_score: string, away_score: string } }>({});
  const [savingScore, setSavingScore] = useState<number | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const bracketRef = useRef<BracketData | null>(null);

  useEffect(() => {
    console.log('Bracket: useEffect triggered with seasonId', seasonId);
    fetchBracket(seasonId)
      .then(data => {
        console.log('Bracket: fetchBracket success', data);
        setBracket(data);
        
        // Initialize resultForms with existing scores from the backend
        const initialResultForms: { [key: number]: { home_score: string, away_score: string } } = {};
        Object.values(data).forEach((roundGames: Game[]) => {
          roundGames.forEach((game: Game) => {
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
  }, [eligibleTeams, selectedTeams]);

  const resetScoreInputsOnTeamChange = (newBracket: BracketData, oldBracket: BracketData | null, currentForms: { [key: number]: { home_score: string, away_score: string } }, changedGameId?: number) => {
    const updatedForms = { ...currentForms };
    
    Object.entries(newBracket).forEach(([roundKey, roundGames]: [string, Game[]]) => {
      roundGames.forEach((game: Game) => {
        // If this is the game that was just changed, clear its scores
        if (changedGameId && game.game_id === changedGameId) {
          delete updatedForms[game.game_id];
          return;
        }
        
        // Check if teams changed for this game
        const oldGame = oldBracket?.[roundKey]?.find((g: Game) => g.game_id === game.game_id);
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

  // Save score and advance winner
  const saveScoreAndAdvance = async (game: Game, round: string, idx: number) => {
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
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-success/20 border border-success/40 text-success px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      {scoreError && (
        <div className="bg-destructive/20 border border-destructive/40 text-destructive px-4 py-3 rounded">
          {scoreError}
        </div>
      )}

      {/* Seeding Section */}
      <Card className="shadow-md">
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
      className="w-20 text-center text-lg font-bold border-2 border-card rounded-lg px-3 py-2 focus:border-primary focus:outline-none transition-colors text-foreground bg-muted"
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
  bracket: BracketData;
  eligibleTeams: PlayoffEligibleTeam[];
  selectedTeams: (number | null)[];
  seeding: boolean;
  resultForms: { [key: number]: { home_score: string, away_score: string } };
  handleScoreChange: (gameId: number, field: 'home_score' | 'away_score', value: string) => void;
  saveScoreAndAdvance: (game: Game, round: string, idx: number) => void;
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
}: BracketVisualProps) {
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  // Create team ID to seed mapping for display
  const teamIdToSeed: { [key: number]: number } = {};
  selectedTeams.forEach((teamId, index) => {
    if (teamId !== null) {
      teamIdToSeed[teamId] = index + 1;
    }
  });

  // Utility to get team info by ID from eligibleTeams
  function getTeamInfo(team_id: number | null | undefined, eligibleTeams: PlayoffEligibleTeam[]) {
    if (team_id == null) return undefined;
    return eligibleTeams.find(t => t.team_id === team_id);
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
                <p className="text-sm text-muted-foreground">Week {round.week}</p>
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
                {roundGames.map((game: Game, idx: number) => {
                  const home = getTeamInfo(game.home_team_id, eligibleTeams);
                  const away = getTeamInfo(game.away_team_id, eligibleTeams);
                  const hasScore = game.home_score !== null && game.away_score !== null;
                  const isEditing = editingGameId === game.game_id;
                  return (
                    <div key={game.game_id} className="border border-card rounded-xl p-4 bg-card min-h-[var(--size-17_5)] flex flex-col gap-2 transition-shadow relative shadow-sm">
                      <div className="font-medium mb-1 flex flex-col gap-1">
                        <span className="flex items-center gap-1">
                          <Badge variant="secondary" style={{ minWidth: 28, textAlign: 'center', fontSize: 13, padding: '2px 8px' }}>
                            {home ? (selectedTeams.findIndex((id) => id === home.team_id) !== -1 ? (selectedTeams.findIndex((id) => id === home.team_id) + 1) : '-') : '-'}
                          </Badge>
                          {home ? (
                            <>
                              {home.team_name}
                              <span className="ml-1 text-muted-foreground text-xs">
                                {home.final_rank && home.final_rank >= 1 && home.final_rank <= 25 ? `#${home.final_rank}` : '#NR'}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">TBD</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Badge variant="secondary" style={{ minWidth: 28, textAlign: 'center', fontSize: 13, padding: '2px 8px' }}>
                            {away ? (selectedTeams.findIndex((id) => id === away.team_id) !== -1 ? (selectedTeams.findIndex((id) => id === away.team_id) + 1) : '-') : '-'}
                          </Badge>
                          {away ? (
                            <>
                              {away.team_name}
                              <span className="ml-1 text-muted-foreground text-xs">
                                {away.final_rank && away.final_rank >= 1 && away.final_rank <= 25 ? `#${away.final_rank}` : '#NR'}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">TBD</span>
                          )}
                        </span>
                      </div>
                      {/* Score Display/Input */}
                      {hasScore && !isEditing ? (
                        <div className="flex items-center gap-2 mt-2 justify-center">
                          <span className="text-lg font-bold">{game.home_score} - {game.away_score}</span>
                          <Button variant="ghost" size="icon" onClick={() => setEditingGameId(game.game_id)} className="ml-2" title="Edit Score">
                            <Pencil size={18} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-2 justify-center">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">H:</span>
                            <ScoreInput
                              value={resultForms[game.game_id]?.home_score ?? ''}
                              onChange={(value) => handleScoreChange(game.game_id, 'home_score', value)}
                              disabled={savingScore === game.game_id}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">A:</span>
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
                            className="text-xs px-2 py-1 ml-1"
                          >
                            {savingScore === game.game_id ? 'Saving...' : 'Save'}
                          </Button>
                          {hasScore && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingGameId(null)}
                              className="ml-1"
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