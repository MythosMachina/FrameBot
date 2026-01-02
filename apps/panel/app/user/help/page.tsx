"use client";

import PanelHeader from "../../_components/PanelHeader";

export default function UserHelpPage() {
  return (
    <main className="panel">
      <PanelHeader
        eyebrow="Help"
        title="Bot Onboarding"
        lede="Follow these steps to connect your Automaton to Discord."
      />

      <section className="grid">
        <div className="card">
          <h2>Step 1: Create a Discord App</h2>
          <p>Go to the Discord Developer Portal and create a new application.</p>
        </div>
        <div className="card">
          <h2>Step 2: Create a Bot</h2>
          <p>In the Bot section, add a bot and copy the Bot Token.</p>
        </div>
        <div className="card">
          <h2>Step 3: Invite the Bot</h2>
          <p>
            Use OAuth2 URL Generator. Select the scope <strong>bot</strong> (optional:
            <strong>applications.commands</strong>) and grant permissions like
            <strong>View Channels</strong> and <strong>Read Message History</strong>.
          </p>
        </div>
        <div className="card">
          <h2>Step 4: Create Automaton</h2>
          <p>In Automatons, create a new Automaton with the Bot Token.</p>
        </div>
        <div className="card">
          <h2>Step 5: Configure Guild/Channel</h2>
          <p>
            Click Configure, pick the server and the channel. Save to bind the Automaton.
          </p>
        </div>
        <div className="card">
          <h2>Step 6: Assign Gears</h2>
          <p>Open Workshop, select the Automaton, and assign Gears.</p>
        </div>
      </section>
    </main>
  );
}
