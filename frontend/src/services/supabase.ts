import { createClient } from "@supabase/supabase-js";

export type AccountCompany = {
  id_company: number | string;
  nome: string;
  cnpj: string;
};

export type AccountDashboard = {
  name: string;
  email: string;
  companies: AccountCompany[];
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente do frontend para habilitar o cadastro.",
    );
  }
  return supabase;
}

export async function findLoginId(email: string): Promise<number | null> {
  const { data, error } = await getSupabaseClient()
    .from("Login")
    .select("id_login")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível consultar o perfil da conta: ${error.message}`);
  }
  return data?.id_login ?? null;
}

export async function accountHasCompany(email: string): Promise<boolean> {
  const loginId = await findLoginId(email);
  if (loginId === null) {
    return false;
  }

  const { data, error } = await getSupabaseClient()
    .from("Company")
    .select("id_company")
    .eq("id_login", loginId)
    .limit(1);

  if (error) {
    throw new Error(`Não foi possível consultar as empresas da conta: ${error.message}`);
  }
  return data.length > 0;
}

export async function fetchAccountDashboard(email: string): Promise<AccountDashboard | null> {
  const client = getSupabaseClient();
  const { data: login, error: loginError } = await client
    .from("Login")
    .select("id_login, nome")
    .eq("email", email)
    .maybeSingle();

  if (loginError) {
    throw new Error(`Não foi possível carregar o perfil da conta: ${loginError.message}`);
  }
  if (!login) {
    return null;
  }

  const { data: companies, error: companiesError } = await client
    .from("Company")
    .select("id_company, nome, cnpj")
    .eq("id_login", login.id_login)
    .order("id_company");

  if (companiesError) {
    throw new Error(`Não foi possível carregar as empresas da conta: ${companiesError.message}`);
  }

  return {
    name: login.nome || email.split("@")[0],
    email,
    companies,
  };
}

export async function syncLoginName(email: string, name: string): Promise<void> {
  const loginId = await findLoginId(email);
  if (loginId === null) {
    return;
  }

  const { error } = await getSupabaseClient()
    .from("Login")
    .update({ nome: name })
    .eq("id_login", loginId);

  if (error) {
    throw new Error(`Não foi possível atualizar o nome do perfil: ${error.message}`);
  }
}

export async function saveCompanies(
  email: string,
  name: string,
  companies: Array<{ nome: string; cnpj: string }>,
): Promise<string[]> {
  const client = getSupabaseClient();
  let loginId = await findLoginId(email);

  if (loginId === null) {
    const { data, error } = await client
      .from("Login")
      .insert({ email, nome: name })
      .select("id_login")
      .single();

    if (error) {
      throw new Error(`Não foi possível salvar o perfil da conta: ${error.message}`);
    }
    loginId = data.id_login;
  }

  const { data, error } = await client
    .from("Company")
    .insert(
      companies.map((company) => ({
        id_login: loginId,
        nome: company.nome,
        cnpj: company.cnpj,
      })),
    )
    .select("id_company");

  if (error) {
    throw new Error(`Não foi possível salvar as empresas: ${error.message}`);
  }
  return data.map((company) => String(company.id_company));
}
