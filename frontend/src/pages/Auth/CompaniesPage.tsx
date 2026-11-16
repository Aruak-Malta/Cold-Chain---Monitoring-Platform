import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Building2, LogOut, Plus, Trash2 } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import coldGhostMark from "../../assets/cold-ghost-mark.jpeg";
import {
  accountHasCompany,
  getSupabaseClient,
  saveCompanies,
} from "../../services/supabase";
import { saveSelectedCompanyId } from "../../services/companySelectionService";
import "./Auth.css";

type CompanyDraft = {
  key: number;
  name: string;
  cnpj: string;
};

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function isValidCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const calculateDigit = (slice: string, weights: number[]) => {
    const sum = [...slice].reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const firstDigit = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(digits.slice(0, 12) + firstDigit, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

export function CompaniesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isAddingCompany = searchParams.get("adicionar") === "1";
  const keyRef = useRef(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [companies, setCompanies] = useState<CompanyDraft[]>([{ key: 0, name: "", cnpj: "" }]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await getSupabaseClient().auth.getUser();
        if (error) throw error;
        if (!data.user?.email) {
          navigate("/painel", { replace: true });
          return;
        }
        if (!active) return;
        if (await accountHasCompany(data.user.email) && !isAddingCompany) {
          if (active) navigate("/app", { replace: true });
          return;
        }
        if (!active) return;
        setEmail(data.user.email);
        const metadataName = data.user.user_metadata.nome ?? data.user.user_metadata.full_name;
        const stateName = (location.state as { name?: string } | null)?.name;
        setName(
          stateName ||
            (typeof metadataName === "string" ? metadataName : "") ||
            data.user.email.split("@")[0],
        );
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível validar sua sessão.");
        }
      } finally {
        if (active) setIsCheckingSession(false);
      }
    })();
    return () => { active = false; };
  }, [isAddingCompany, location.state, navigate]);

  function updateCompany(key: number, field: "name" | "cnpj", value: string) {
    setCompanies((current) =>
      current.map((company) => company.key === key ? { ...company, [field]: value } : company),
    );
  }

  function addCompany() {
    const key = keyRef.current++;
    setCompanies((current) => [...current, { key, name: "", cnpj: "" }]);
  }

  function removeCompany(key: number) {
    setCompanies((current) => current.filter((company) => company.key !== key));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const normalized = companies.map((company) => ({
      nome: company.name.trim(),
      cnpj: company.cnpj.replace(/\D/g, ""),
    }));
    const invalidIndex = normalized.findIndex((company) => !company.nome || !isValidCnpj(company.cnpj));
    if (invalidIndex !== -1) {
      setErrorMessage(`Informe o nome e um CNPJ válido para a empresa ${invalidIndex + 1}.`);
      return;
    }
    if (new Set(normalized.map((company) => company.cnpj)).size !== normalized.length) {
      setErrorMessage("Cada empresa precisa ter um CNPJ diferente.");
      return;
    }

    setIsLoading(true);
    try {
      const newCompanyIds = await saveCompanies(email, name.trim(), normalized);
      if (newCompanyIds[0]) {
        saveSelectedCompanyId(email, newCompanyIds[0]);
      }
      navigate("/app", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar suas empresas.");
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) {
        setErrorMessage(`Não foi possível sair da conta: ${error.message}`);
        return;
      }
      navigate("/painel", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível sair da conta.");
    }
  }

  if (isCheckingSession) {
    return <main className="auth-loading" aria-live="polite">Verificando sua conta...</main>;
  }

  return (
    <main className="company-page">
      <header className="company-header">
        <a className="auth-brand" href="/" aria-label="Cold Ghost, página inicial">
          <img src={coldGhostMark} alt="" />
          <span>Cold Ghost</span>
        </a>
        <button className="company-signout" onClick={signOut} type="button">
          <LogOut aria-hidden="true" /> Sair
        </button>
      </header>
      <section className="company-card">
        <div className="company-step"><span>ETAPA 1 DE 1</span><strong>{isAddingCompany ? "Nova empresa" : "Perfil da operação"}</strong></div>
        <div className="company-heading-icon"><Building2 aria-hidden="true" /></div>
        <span className="auth-kicker">SÓ MAIS UM PASSO</span>
        <h1>{isAddingCompany ? "Adicione outra empresa" : "Cadastre suas empresas"}</h1>
        <p>
          {isAddingCompany
            ? "Cadastre uma empresa para adicioná-la à sua conta."
            : "Adicione ao menos uma empresa para configurar seu espaço de monitoramento."}
        </p>
        <form className="company-form" onSubmit={handleSubmit}>
          {companies.map((company, index) => (
            <fieldset className="company-fields" key={company.key}>
              <legend>Empresa {index + 1}</legend>
              {companies.length > 1 && (
                <button
                  aria-label={`Remover empresa ${index + 1}`}
                  className="company-remove"
                  onClick={() => removeCompany(company.key)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" />
                </button>
              )}
              <label className="auth-field">
                <span>Nome da empresa</span>
                <input
                  onChange={(event) => updateCompany(company.key, "name", event.target.value)}
                  placeholder="Ex.: Mercado Central"
                  required
                  value={company.name}
                />
              </label>
              <label className="auth-field">
                <span>CNPJ</span>
                <input
                  inputMode="numeric"
                  maxLength={18}
                  onChange={(event) => updateCompany(company.key, "cnpj", formatCnpj(event.target.value))}
                  placeholder="00.000.000/0000-00"
                  required
                  value={company.cnpj}
                />
              </label>
            </fieldset>
          ))}
          <button className="company-add" onClick={addCompany} type="button">
            <Plus aria-hidden="true" /> Adicionar outra empresa
          </button>
          {errorMessage && <p className="auth-message auth-error" role="alert">{errorMessage}</p>}
          <button className="auth-submit" disabled={isLoading || !email} type="submit">
            {isLoading ? "Salvando..." : isAddingCompany ? "Adicionar empresa" : "Salvar e continuar"}
            {!isLoading && <ArrowRight aria-hidden="true" />}
          </button>
        </form>
      </section>
    </main>
  );
}
