export const initialFilters = () => ({ range: 7, kenh: '', trang_thai: '', from: '', to: '', search: '', dateField: 'ngay_tao', sortBy: 'ngay_tao', sortDir: 'desc' });
let state = { data: null, filters: initialFilters(), lastUpdated: null, status: 'idle', error: '' };
const listeners = new Set();
export const getState = () => state;
export function notify() { for (const listener of listeners) listener(state); }
export function setState(patch) { state = { ...state, ...patch }; notify(); }
export function setFilters(patch) { setState({ filters: { ...state.filters, ...patch } }); }
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
