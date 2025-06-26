import { useEffect, useState } from 'react';
import { fetchPlayoffEligibleTeams, manualSeedBracket } from '../../../lib/api';
import { API_BASE_URL } from '../../../lib/api';
import Bracket from './Bracket';

// This is the playoff bracket page for a given season. Expects season_id from params.

interface PlayoffBracketPageProps {
  params: { season_id: string };
}

const PlayoffBracketPage = ({ params }: PlayoffBracketPageProps) => {
  const { season_id } = params;
  return <Bracket seasonId={season_id} />;
};

export default PlayoffBracketPage; 