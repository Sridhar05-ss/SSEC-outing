// Helper functions to get/set auth state from localStorage
const getAuthState = () => {
  try {
    const stored = localStorage.getItem('authState');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading auth state from localStorage:', error);
  }
  return { isAuthenticated: false, role: null };
};

const setAuthState = (state: { isAuthenticated: boolean; role: null | 'admin' | 'management' }) => {
  try {
    localStorage.setItem('authState', JSON.stringify(state));
  } catch (error) {
    console.error('Error writing auth state to localStorage:', error);
  }
};

export const fakeAuth = {
  get isAuthenticated() {
    return getAuthState().isAuthenticated;
  },
  set isAuthenticated(value: boolean) {
    const currentState = getAuthState();
    setAuthState({ ...currentState, isAuthenticated: value });
  },
  get role() {
    return getAuthState().role;
  },
  set role(value: null | 'admin' | 'management') {
    const currentState = getAuthState();
    setAuthState({ ...currentState, role: value });
  },
  // Method to clear auth state (for logout)
  logout() {
    localStorage.removeItem('authState');
  }
}; 