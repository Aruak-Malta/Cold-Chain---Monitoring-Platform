const selectedCompanyKey = "cold-ghost-selected-company";

function getStorageKey(email: string): string {
  return `${selectedCompanyKey}:${email.trim().toLowerCase()}`;
}

export function readSelectedCompanyId(email: string): string | null {
  try {
    return localStorage.getItem(getStorageKey(email));
  } catch (error) {
    console.error("Não foi possível ler a empresa selecionada:", error);
    return null;
  }
}

export function saveSelectedCompanyId(email: string, companyId: string): boolean {
  try {
    localStorage.setItem(getStorageKey(email), companyId);
    return true;
  } catch (error) {
    console.error("Não foi possível salvar a empresa selecionada:", error);
    return false;
  }
}
