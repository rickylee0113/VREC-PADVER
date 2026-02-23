/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TeamProvider } from './context/TeamContext';
import HomeScreen from './screens/HomeScreen';
import LineupScreen from './screens/LineupScreen';
import MatchSetupScreen from './screens/MatchSetupScreen';
import MatchScreen from './screens/MatchScreen';

export default function App() {
  return (
    <TeamProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/match-setup" element={<MatchSetupScreen />} />
          <Route path="/match" element={<MatchScreen />} />
          <Route path="/lineup/:id" element={<LineupScreen />} />
        </Routes>
      </BrowserRouter>
    </TeamProvider>
  );
}
