"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { fetchTeams, setUserControlledTeam } from "@/lib/api";

export default function SettingsPage() {
    const [teams, setTeams] = useState<any[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetchTeams().then((data) => {
            setTeams(data);
            const userTeam = data.find((t: any) => t.is_user_controlled);
            setSelectedTeam(userTeam ? userTeam.team_id : null);
            setLoading(false);
        });
    }, []);

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const teamId = Number(e.target.value);
        setSelectedTeam(teamId);
        setSaving(true);
        setMessage(null);
        try {
            await setUserControlledTeam(teamId);
            setMessage("User-controlled team updated!");
        } catch (err: any) {
            setMessage("Failed to update user-controlled team.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">User-Controlled Team</label>
                        {loading ? (
                            <span>Loading teams...</span>
                        ) : (
                            <select
                                className="border rounded px-3 py-2"
                                value={selectedTeam ?? ''}
                                onChange={handleChange}
                                disabled={saving}
                            >
                                <option value="" disabled>Select a team</option>
                                {teams.map((team) => (
                                    <option key={team.team_id} value={team.team_id}>{team.name}</option>
                                ))}
                            </select>
                        )}
                        {saving && <span className="ml-2 text-blue-500">Saving...</span>}
                        {message && <div className="mt-2 text-green-600">{message}</div>}
                    </div>
                    <p>This is the settings page. More settings will be available here soon.</p>
                </CardContent>
            </Card>
        </div>
    );
} 