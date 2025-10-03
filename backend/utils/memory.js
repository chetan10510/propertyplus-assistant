const sessions = {};
export const getSession = (id) => sessions[id] || [];
export const updateSession = (id,msg) => {
  sessions[id] = [...(sessions[id]||[]), msg];
};
export const clearSession = (id)=>{ delete sessions[id]; };
