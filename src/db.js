import Dexie from 'dexie'

export const db = new Dexie('gamtrackr')

db.version(1).stores({
  pendingEvents: 'id, game_id, event_type_id, player_id, synced',
})