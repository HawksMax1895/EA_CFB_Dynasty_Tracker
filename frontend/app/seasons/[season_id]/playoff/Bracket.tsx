import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchPlayoffEligibleTeams, manualSeedBracket, fetchBracket, API_BASE_URL } from '../../../../lib/api';

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

  // Fetch bracket
  useEffect(() => {
    if (seasonId) {
      setLoading(true);
      fetchBracket(seasonId)
        .then(data => {
          console.log('Bracket data after save:', data); // Debug log
          setBracket(data);
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
      fetchBracket(seasonId)
        .then(data => {
          setBracket(data);
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
    const home_score = scoreInputs[game.game_id]?.home;
    const away_score = scoreInputs[game.game_id]?.away;
    console.log('Attempting to save score:', { home_score, away_score, game });
    if (home_score === undefined || away_score === undefined || home_score === '' || away_score === '' || game.home_team_id == null || game.away_team_id == null) {
      console.log('Early return: missing score or team', { home_score, away_score, home_team_id: game.home_team_id, away_team_id: game.away_team_id });
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
          bracketRef.current = data;
          setScoreInputs(prev => ({
            ...prev,
            [game.game_id]: { home: '', away: '' }
          }));
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
    fetchBracket(seasonId)
      .then(data => {
        setBracket(data);
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

  function BracketVisual({ bracket, eligibleTeams, scoreInputs, handleScoreChange, savingScore, scoreError, saveScoreAndAdvance, handleScoreKeyDown }: any) {
    if (!bracket || Object.keys(bracket).length === 0) return null;
    const rounds = [
      { key: 'First Round', label: 'First Round' },
      { key: 'Quarterfinals', label: 'Quarterfinals' },
      { key: 'Semifinals', label: 'Semifinals' },
      { key: 'Championship', label: 'Championship' },
    ];
    return (
      <div style={{ display: 'flex', gap: 32, marginTop: 32, overflowX: 'auto' }}>
        {rounds.map((round, i) => (
          <div key={round.key} style={{ minWidth: 180 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{round.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {(bracket[round.key] || []).map((game: any, idx: number) => {
                const home = getTeamInfo(game.home_team_id, eligibleTeams);
                const away = getTeamInfo(game.away_team_id, eligibleTeams);
                return (
                  <div key={game.game_id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12, background: '#f9f9f9', minHeight: 60 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {home ? home.team_name : (
                        <select
                          value={''}
                          onChange={e => handleAssignTeam(game.game_id, 'home', Number(e.target.value))}
                          disabled={seeding}
                        >
                          <option value="">Assign Home Team</option>
                          {eligibleTeams.filter(t => t.team_id !== game.away_team_id).map(team => (
                            <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
                          ))}
                        </select>
                      )}
                      {game.home_score !== null && game.home_score !== undefined ? ` (${game.home_score})` : ''}
                    </div>
                    <div style={{ fontWeight: 500 }}>
                      {away ? away.team_name : (
                        <select
                          value={''}
                          onChange={e => handleAssignTeam(game.game_id, 'away', Number(e.target.value))}
                          disabled={seeding}
                        >
                          <option value="">Assign Away Team</option>
                          {eligibleTeams.filter(t => t.team_id !== game.home_team_id).map(team => (
                            <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
                          ))}
                        </select>
                      )}
                      {game.away_score !== null && game.away_score !== undefined ? ` (${game.away_score})` : ''}
                    </div>
                    {/* Score input fields */}
                    {home && away && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          key={`home-${game.game_id}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Home Score"
                          value={scoreInputs[game.game_id]?.home ?? ''}
                          onChange={e => handleScoreChange(game, round.key, idx, 'home', e.target.value)}
                          onKeyDown={e => handleScoreKeyDown(e, game, round.key, idx)}
                          style={{ width: 60 }}
                        />
                        <span>:</span>
                        <input
                          key={`away-${game.game_id}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Away Score"
                          value={scoreInputs[game.game_id]?.away ?? ''}
                          onChange={e => handleScoreChange(game, round.key, idx, 'away', e.target.value)}
                          onKeyDown={e => handleScoreKeyDown(e, game, round.key, idx)}
                          style={{ width: 60 }}
                        />
                        <button
                          onClick={() => saveScoreAndAdvance(game, round.key, idx)}
                          disabled={savingScore === game.game_id}
                          style={{ marginLeft: 8 }}
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
          </div>
        ))}
      </div>
    );
  }

  if (loading) return <div>Loading bracket...</div>;

  return (
    <div>
      <h1>12-Team Playoff Bracket</h1>
      <button onClick={handleRefreshBracket} style={{ marginBottom: 16 }}>Refresh Bracket</button>
      {/* Manual selection UI if bracket is not seeded */}
      {eligibleTeams.length > 0 && (!bracket || !bracket['First Round'] || bracket['First Round'].some((g: any) => !g.home_team_id || !g.away_team_id)) && (
        <div style={{ marginBottom: 32 }}>
          <h2>Manual Playoff Team Selection</h2>
          <p>Select 12 teams in seed order (1 = top seed):</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Seed {i + 1}:</span>
                <select
                  value={selectedTeams[i] ?? ''}
                  onChange={e => handleSelectTeam(i, Number(e.target.value))}
                >
                  <option value="">Select team</option>
                  {eligibleTeams.map(team => (
                    <option
                      key={team.team_id}
                      value={team.team_id}
                      disabled={selectedTeams.includes(team.team_id)}
                    >
                      {team.team_name} (Rank: {team.final_rank ?? 'N/A'}, Conf: {team.conference_name}, {team.is_conference_champion ? 'Champion' : 'Non-Champ'}, {team.wins}-{team.losses})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={handleSeedBracket}
            disabled={seeding}
            style={{ marginTop: 16 }}
          >
            {seeding ? 'Seeding...' : 'Seed Bracket'}
          </button>
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
        </div>
      )}
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