import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import coldGhostMark from "../../assets/cold-ghost-mark.jpeg";
import { accountHasCompany, getSupabaseClient } from "../../services/supabase";
import "./Auth.css";

type AuthPageProps = {
  mode: "login" | "register";
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 5)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.05 11.05 0 0 1-4.8 7.24l7.73 5.99c4.52-4.18 7.11-10.34 7.11-17.7Z" transform="translate(0 -5)" />
      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.2a23.9 23.9 0 0 0 0 21.58l7.98-6.2Z" transform="translate(0 -1)" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-5.99c-2.14 1.45-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -5)" />
    </svg>
  );
}

export function AuthPage({ mode }: Readonly<AuthPageProps>) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const normalizedEmail = email.trim().toLowerCase();

      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { nome: name.trim() },
            emailRedirectTo: `${window.location.origin}/empresas`,
          },
        });
        if (error) throw error;

        if (!data.session) {
          setNotice("Conta criada. Confirme seu e-mail e depois entre para cadastrar sua empresa.");
          return;
        }
        navigate("/empresas", { state: { name: name.trim() }, replace: true });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;

      if (await accountHasCompany(normalizedEmail)) {
        navigate("/app", { replace: true });
      } else {
        navigate("/empresas", { replace: true });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível concluir a autenticação.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMessage("");
    setIsLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/empresas` },
      });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível iniciar o acesso com Google.",
      );
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link className="auth-brand" to="/" aria-label="Cold Ghost, página inicial">
          <img src={coldGhostMark} alt="" />
          <span>Cold Ghost</span>
        </Link>
        <div className="auth-visual-copy">
          <span className="auth-kicker">MONITORAMENTO INTELIGENTE</span>
          <h1>Mais controle para manter sua operação sempre fria.</h1>
          <p>Informação clara sobre seus equipamentos, onde quer que você esteja.</p>
        </div>
        <div className="auth-visual-footer">Tecnologia para cuidar do que importa.</div>
      </section>

      <section className="auth-content">
        <Link className="auth-back-link" to="/">
          <ArrowLeft aria-hidden="true" /> Voltar ao início
        </Link>
        <div className="auth-card">
          <span className="auth-kicker">{isRegister ? "COMECE AGORA" : "BEM-VINDO DE VOLTA"}</span>
          <h2>{isRegister ? "Crie sua conta" : "Acesse sua conta"}</h2>
          <p className="auth-description">
            {isRegister
              ? "Cadastre-se para acompanhar suas empresas e equipamentos."
              : "Entre para continuar acompanhando sua operação."}
          </p>

          <button className="auth-google-button" onClick={handleGoogleSignIn} disabled={isLoading} type="button">
            <GoogleMark />
            {isRegister ? "Cadastrar com Google" : "Continuar com Google"}
          </button>

          <div className="auth-divider"><span>ou continue com e-mail</span></div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <label className="auth-field">
                <span>Nome completo</span>
                <span className="auth-input-wrap">
                  <UserRound aria-hidden="true" />
                  <input
                    autoComplete="name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Seu nome"
                    required
                    value={name}
                  />
                </span>
              </label>
            )}
            <label className="auth-field">
              <span>E-mail</span>
              <span className="auth-input-wrap">
                <Mail aria-hidden="true" />
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@empresa.com"
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>
            <label className="auth-field">
              <span>Senha</span>
              <span className="auth-input-wrap">
                <LockKeyhole aria-hidden="true" />
                <input
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </label>
            {errorMessage && <p className="auth-message auth-error" role="alert">{errorMessage}</p>}
            {notice && <p className="auth-message auth-success" role="status">{notice}</p>}
            <button className="auth-submit" disabled={isLoading} type="submit">
              {isLoading ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
              {!isLoading && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Já tem uma conta?" : "Não tem conta?"}{" "}
            <Link to={isRegister ? "/painel" : "/cadastro"}>
              {isRegister ? "Entrar" : "Cadastre-se"}
            </Link>
          </p>
          {!isRegister && (
            <Link className="auth-demo-link" to="/demo">
              Ver demonstração sem cadastro
            </Link>
          )}
        </div>
        <p className="auth-legal">Ao continuar, seus dados serão protegidos com segurança.</p>
      </section>
    </main>
  );
}
