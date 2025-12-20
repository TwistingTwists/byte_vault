import React, { useState } from 'react';
import { Database, FileText, MessageSquare, Upload, Calendar } from 'lucide-react';

const RecordablesArchitecture = () => {
  const [activeTab, setActiveTab] = useState('structure');

  const RecordingsTable = () => (
    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
      <div className="flex items-center gap-2 mb-3">
        <Database className="text-blue-600" size={20} />
        <h3 className="font-bold text-blue-900">recordings (main table)</h3>
      </div>
      <div className="space-y-1 text-sm">
        <div className="bg-white p-2 rounded font-mono">id (primary key)</div>
        <div className="bg-white p-2 rounded font-mono">recordable_id (foreign key)</div>
        <div className="bg-white p-2 rounded font-mono">recordable_type (string)</div>
        <div className="bg-white p-2 rounded font-mono">bucket_id (foreign key)</div>
        <div className="bg-white p-2 rounded font-mono">creator_id</div>
        <div className="bg-white p-2 rounded font-mono">parent_id (tree structure)</div>
        <div className="bg-white p-2 rounded font-mono">created_at, updated_at</div>
        <div className="bg-white p-2 rounded font-mono">color, position</div>
      </div>
      <div className="mt-3 text-xs text-blue-700 italic">
        ✓ Lightweight - no text columns<br/>
        ✓ Billions of rows, small disk size<br/>
        ✓ Never needs migration for new types
      </div>
    </div>
  );

  const RecordablesSection = () => (
    <div className="space-y-3">
      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="text-green-600" size={20} />
          <h3 className="font-bold text-green-900">messages (recordable)</h3>
        </div>
        <div className="space-y-1 text-sm">
          <div className="bg-white p-2 rounded font-mono">id (primary key)</div>
          <div className="bg-white p-2 rounded font-mono">title (text)</div>
          <div className="bg-white p-2 rounded font-mono">content (text)</div>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="text-purple-600" size={20} />
          <h3 className="font-bold text-purple-900">documents (recordable)</h3>
        </div>
        <div className="space-y-1 text-sm">
          <div className="bg-white p-2 rounded font-mono">id (primary key)</div>
          <div className="bg-white p-2 rounded font-mono">title (text)</div>
          <div className="bg-white p-2 rounded font-mono">content (text)</div>
          <div className="bg-white p-2 rounded font-mono">format (string)</div>
        </div>
      </div>

      <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-300">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="text-orange-600" size={20} />
          <h3 className="font-bold text-orange-900">uploads (recordable)</h3>
        </div>
        <div className="space-y-1 text-sm">
          <div className="bg-white p-2 rounded font-mono">id (primary key)</div>
          <div className="bg-white p-2 rounded font-mono">filename (string)</div>
          <div className="bg-white p-2 rounded font-mono">file_size (integer)</div>
          <div className="bg-white p-2 rounded font-mono">content_type (string)</div>
          <div className="bg-white p-2 rounded font-mono">storage_key (string)</div>
        </div>
      </div>
    </div>
  );

  const EventsTable = () => (
    <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="text-yellow-600" size={20} />
        <h3 className="font-bold text-yellow-900">events (version history)</h3>
      </div>
      <div className="space-y-1 text-sm">
        <div className="bg-white p-2 rounded font-mono">id (primary key)</div>
        <div className="bg-white p-2 rounded font-mono">recording_id (foreign key)</div>
        <div className="bg-white p-2 rounded font-mono">recordable_id (foreign key)</div>
        <div className="bg-white p-2 rounded font-mono">recordable_type (string)</div>
        <div className="bg-white p-2 rounded font-mono">action (string)</div>
        <div className="bg-white p-2 rounded font-mono">created_at</div>
      </div>
      <div className="mt-3 text-xs text-yellow-700 italic">
        ✓ Tracks all historical versions<br/>
        ✓ Enables "see what changed" feature<br/>
        ✓ Immutable audit trail
      </div>
    </div>
  );

  const ExampleFlow = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-bold mb-3 text-gray-900">Example: Creating a Message</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-white p-3 rounded border-l-4 border-blue-500">
            <div className="font-bold text-blue-900">Step 1: Create recordable</div>
            <code className="text-xs block mt-1 text-gray-700">
              INSERT INTO messages (title, content)<br/>
              VALUES ('Team Update', 'Here is our weekly update...')
            </code>
          </div>
          
          <div className="bg-white p-3 rounded border-l-4 border-green-500">
            <div className="font-bold text-green-900">Step 2: Create recording</div>
            <code className="text-xs block mt-1 text-gray-700">
              INSERT INTO recordings (recordable_id, recordable_type, bucket_id)<br/>
              VALUES (42, 'Message', 1)
            </code>
          </div>
          
          <div className="bg-white p-3 rounded border-l-4 border-yellow-500">
            <div className="font-bold text-yellow-900">Step 3: Create event</div>
            <code className="text-xs block mt-1 text-gray-700">
              INSERT INTO events (recording_id, recordable_id, action)<br/>
              VALUES (100, 42, 'created')
            </code>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-bold mb-3 text-gray-900">Example: Editing the Message</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-white p-3 rounded border-l-4 border-blue-500">
            <div className="font-bold text-blue-900">Step 1: Create NEW recordable (immutable!)</div>
            <code className="text-xs block mt-1 text-gray-700">
              INSERT INTO messages (title, content)<br/>
              VALUES ('Team Update', 'Here is our UPDATED weekly update...')
            </code>
          </div>
          
          <div className="bg-white p-3 rounded border-l-4 border-green-500">
            <div className="font-bold text-green-900">Step 2: Update recording pointer</div>
            <code className="text-xs block mt-1 text-gray-700">
              UPDATE recordings<br/>
              SET recordable_id = 43<br/>
              WHERE id = 100
            </code>
          </div>
          
          <div className="bg-white p-3 rounded border-l-4 border-yellow-500">
            <div className="font-bold text-yellow-900">Step 3: Create new event</div>
            <code className="text-xs block mt-1 text-gray-700">
              INSERT INTO events (recording_id, recordable_id, action)<br/>
              VALUES (100, 43, 'updated')
            </code>
          </div>
        </div>
        <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-900">
          💡 Original message (id: 42) still exists! Can show "what changed" by comparing messages 42 vs 43
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-bold mb-3 text-gray-900">Example: Copying a Message</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-white p-3 rounded border-l-4 border-green-500">
            <div className="font-bold text-green-900">Create new recording pointing to SAME recordable</div>
            <code className="text-xs block mt-1 text-gray-700">
              INSERT INTO recordings (recordable_id, recordable_type, bucket_id)<br/>
              VALUES (43, 'Message', 2)
            </code>
          </div>
        </div>
        <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-900">
          ✨ Super efficient! No content duplication. 1000 copies = 1000 recording rows, 1 message row
        </div>
      </div>
    </div>
  );

  const KeyBenefits = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">🚀 Easy to Add New Types</h3>
        <p className="text-sm text-gray-700">
          Want to add "polls"? Just create a <code className="bg-white px-1 rounded">polls</code> table. 
          No migration of the recordings table needed. Everything (copying, moving, exporting, timeline) 
          works automatically.
        </p>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
        <h3 className="font-bold text-green-900 mb-2">⚡ Fast Queries</h3>
        <p className="text-sm text-gray-700 mb-2">
          Get timeline of ALL content types in one query:
        </p>
        <code className="text-xs block bg-white p-2 rounded text-gray-800">
          SELECT * FROM recordings<br/>
          WHERE created_at &gt; '2024-01-01'<br/>
          ORDER BY created_at DESC<br/>
          LIMIT 20
        </code>
        <p className="text-xs text-gray-600 mt-2">
          Returns messages, documents, uploads, comments - all mixed together, easy to paginate
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
        <h3 className="font-bold text-purple-900 mb-2">💾 Storage Efficient</h3>
        <p className="text-sm text-gray-700">
          Copying content doesn't duplicate the content itself. 1000 copies of a document? 
          1000 lightweight recording rows + 1 document row = massive savings.
        </p>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
        <h3 className="font-bold text-orange-900 mb-2">📜 Complete History</h3>
        <p className="text-sm text-gray-700">
          Immutable recordables + events = full version history. See exactly what changed, 
          when, and restore old versions by just updating the recording pointer.
        </p>
      </div>

      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-bold text-yellow-900 mb-2">🎯 Uniform Interface</h3>
        <p className="text-sm text-gray-700">
          One controller for archiving, one for copying, one for moving - works for ALL types. 
          Mobile API returns generic "recordings" - no app updates needed for new content types.
        </p>
      </div>

      <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
        <h3 className="font-bold text-red-900 mb-2">🌲 Tree Structure</h3>
        <p className="text-sm text-gray-700 mb-2">
          Recordings have parent-child relationships:
        </p>
        <div className="text-xs bg-white p-2 rounded space-y-1 text-gray-800">
          <div>📋 Message Board (recording)</div>
          <div className="ml-4">└─ 💬 Message (recording)</div>
          <div className="ml-8">└─ 💭 Comment (recording)</div>
          <div className="ml-12">└─ 📎 Attachment (recording)</div>
        </div>
      </div>
    </div>
  );

  const TreeStructure = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-bold mb-3 text-gray-900">Tree Organization Example</h3>
        <div className="bg-white p-4 rounded border">
          <div className="font-mono text-sm space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center text-xs">P</div>
              <span>Project (bucket) - id: 1</span>
            </div>
            
            <div className="ml-8 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500 text-white flex items-center justify-center text-xs">MB</div>
              <span>Message Board (recording) - id: 10, parent_id: null</span>
            </div>
            
            <div className="ml-16 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-purple-500 text-white flex items-center justify-center text-xs">M1</div>
              <span>Message (recording) - id: 20, parent_id: 10</span>
            </div>
            
            <div className="ml-24 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-orange-500 text-white flex items-center justify-center text-xs">C1</div>
              <span>Comment (recording) - id: 30, parent_id: 20</span>
            </div>
            
            <div className="ml-24 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-orange-500 text-white flex items-center justify-center text-xs">C2</div>
              <span>Comment (recording) - id: 31, parent_id: 20</span>
            </div>
            
            <div className="ml-16 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-purple-500 text-white flex items-center justify-center text-xs">M2</div>
              <span>Message (recording) - id: 21, parent_id: 10</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-sm space-y-2">
          <div className="bg-blue-50 p-2 rounded">
            <code className="text-xs">bucket.recordings.message_boards</code> → Get message board
          </div>
          <div className="bg-green-50 p-2 rounded">
            <code className="text-xs">message_board.children.messages</code> → Get all messages
          </div>
          <div className="bg-purple-50 p-2 rounded">
            <code className="text-xs">message.children.comments</code> → Get all comments
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <p className="text-gray-600">
          37signals' delegated type pattern - 10+ years of battle-tested architecture
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveTab('structure')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'structure'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Database Structure
        </button>
        <button
          onClick={() => setActiveTab('flow')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'flow'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Example Flows
        </button>
        <button
          onClick={() => setActiveTab('tree')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'tree'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tree Structure
        </button>
        <button
          onClick={() => setActiveTab('benefits')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'benefits'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Key Benefits
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'structure' && (
          <>
            <RecordingsTable />
            <RecordablesSection />
            <EventsTable />
          </>
        )}
        
        {activeTab === 'flow' && <ExampleFlow />}
        
        {activeTab === 'tree' && <TreeStructure />}
        
        {activeTab === 'benefits' && <KeyBenefits />}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-2">Core Principles</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Recordings are mutable</strong> - lightweight pointers that change</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">•</span>
            <span><strong>Recordables are immutable</strong> - never modified, only created</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">•</span>
            <span><strong>Events track history</strong> - recording → recordable at each moment</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-600 font-bold">•</span>
            <span><strong>Tree organization</strong> - recordings have parent-child relationships</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RecordablesArchitecture;