// Helper for dispatching local financial update notifications across components
export const notifyFinancialUpdateLocally = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("financial-updated"));
    try {
      localStorage.setItem("last_financial_update", Date.now().toString());
    } catch {
      // ignore storage errors
    }
  }
};
