import { useEffect, useState } from 'react';
import { fetchPlayoffEligibleTeams, manualSeedBracket, fetchBracket, API_BASE_URL } from '../../../../lib/api';

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

  // Fetch bracket
  useEffect(() => {
    if (seasonId) {
      setLoading(true);
      fetchBracket(seasonId)
        .then(data => {
          setBracket(data);
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
      // Refetch bracket
      fetchBracket(seasonId)
        .then(data => setBracket(data));
    } catch (e) {
      setError('Failed to seed bracket.');
    } finally {
      setSeeding(false);
    }
  };

  // New: Assign a team to a slot in an existing playoff game
  const handleAssignTeam = async (gameId: number, slot: 'home' | 'away', teamId: number) => {
    setSeeding(true);
    setError(null);
    try {
      // PATCH or PUT to a new endpoint, or reuse manualSeedBracket if you want to re-seed all
      // For now, let's PATCH the game directly (assume an endpoint exists)
      await fetch(`${API_BASE_URL}/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`${slot}_team_id`]: teamId })
      });
      // Refetch bracket
      fetchBracket(seasonId)
        .then(data => setBracket(data));
    } catch (e) {
      setError('Failed to assign team.');
    } finally {
      setSeeding(false);
    }
  };

  // Helper to get team info by ID
  function getTeamInfo(teamId: number | null | undefined, eligibleTeams: any[]) {
    if (!teamId) return null;
    return eligibleTeams.find(t => t.team_id === teamId) || null;
  }

  function BracketVisual({ bracket, eligibleTeams }: { bracket: any, eligibleTeams: any[] }) {
    if (!bracket) return null;
    // Order: First Round, Quarterfinals, Semifinals, Championship
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
                      {typeof game.home_score === 'number' && typeof game.away_score === 'number' && (game.home_score !== null && game.away_score !== null) ? ` (${game.home_score})` : ''}
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
                      {typeof game.home_score === 'number' && typeof game.away_score === 'number' && (game.home_score !== null && game.away_score !== null) ? ` (${game.away_score})` : ''}
                    </div>
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
      <BracketVisual bracket={bracket} eligibleTeams={eligibleTeams} />
      <div style={{ marginTop: 32 }}>
        <strong>Bracket Structure (Placeholder):</strong>
        <pre>{`
First Round:
  Game 1: Seed 5 vs Seed 12
  Game 2: Seed 6 vs Seed 11
  Game 3: Seed 7 vs Seed 10
  Game 4: Seed 8 vs Seed 9
Quarterfinals:
  Game 5: Seed 1 vs Winner G4
  Game 6: Seed 2 vs Winner G3
  Game 7: Seed 3 vs Winner G2
  Game 8: Seed 4 vs Winner G1
Semifinals:
  Game 9: Winner G5 vs Winner G8
  Game 10: Winner G6 vs Winner G7
Championship:
  Game 11: Winner G9 vs Winner G10
`}</pre>
      </div>
    </div>
  );
} 