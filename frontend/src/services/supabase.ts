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

export type AccountEquipmentRecord = {
  id_equipamento: number | string;
  id_company: number | string;
  nome: string;
  serial: string;
  setor: string | null;
  tensao: 127 | 220 | null;
};

export type AccountEquipmentInput = {
  id_company: number | string;
  nome: string;
  serial: string;
  setor: string;
  tensao: 127 | 220;
};

export type AccountTelemetryRecord = {
  id_equipamento: number | string;
  temperature: number | null;
  humidity: number | null;
  current: number | null;
  timestamp: string | null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAccountEquipmentRecord(value: unknown): AccountEquipmentRecord {
  if (
    !isRecord(value) ||
    (typeof value.id_equipamento !== "number" && typeof value.id_equipamento !== "string") ||
    (typeof value.id_company !== "number" && typeof value.id_company !== "string") ||
    typeof value.nome_equipamento !== "string" ||
    typeof value.mac_address !== "string" ||
    (value.setor !== null && typeof value.setor !== "string") ||
    (value.tensao !== null && value.tensao !== 127 && value.tensao !== 220)
  ) {
    throw new Error("O Supabase retornou um equipamento com dados inválidos.");
  }

  return {
    id_equipamento: value.id_equipamento,
    id_company: value.id_company,
    nome: value.nome_equipamento,
    serial: value.mac_address,
    setor: value.setor,
    tensao: value.tensao,
  };
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

export async function fetchCompanyEquipments(
  companyId: number | string,
): Promise<AccountEquipmentRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from("Equipamento")
    .select("id_equipamento, id_company, nome_equipamento, mac_address, setor, tensao")
    .eq("id_company", companyId)
    .order("id_equipamento");

  if (error) {
    throw new Error(`Não foi possível carregar os equipamentos da empresa: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error("O Supabase retornou uma lista de equipamentos inválida.");
  }

  return data.map(parseAccountEquipmentRecord);
}

export async function saveCompanyEquipment(
  equipment: AccountEquipmentInput,
): Promise<AccountEquipmentRecord> {
  const normalizedMac = normalizeMacAddress(equipment.serial);
  if (!normalizedMac) {
    throw new Error("Informe o MAC Address do dispositivo.");
  }

  const { data, error } = await getSupabaseClient()
    .rpc("cold_ghost_link_equipment", {
      p_mac_address: normalizedMac,
      p_company_id: equipment.id_company,
      p_name: equipment.nome,
      p_setor: equipment.setor,
      p_tensao: equipment.tensao,
    });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("dispositivo não encontrado")) {
      throw new Error("Não existe um dispositivo enviado pelo sensor com esse MAC Address.");
    }
    if (message.includes("já vinculado")) {
      throw new Error("Esse MAC Address já está vinculado a uma empresa.");
    }
    throw new Error(`Não foi possível vincular o equipamento à empresa: ${error.message}`);
  }

  if (!isRecord(data)) {
    throw new Error("O Supabase não retornou o equipamento vinculado.");
  }

  return parseAccountEquipmentRecord(data);
}

export function normalizeMacAddress(value: string): string {
  return value.trim().replace(/[^0-9a-f]/gi, "").toUpperCase();
}

export async function fetchAccountTelemetry(
  equipmentIds: Array<number | string>,
): Promise<AccountTelemetryRecord[]> {
  if (!equipmentIds.length) {
    return [];
  }

  const { data, error } = await getSupabaseClient()
    .from("Data")
    .select("id_data, id_equipamento, temperatura_float, umidade_float, corrente_float, timestamp")
    .in("id_equipamento", equipmentIds)
    .order("timestamp", { ascending: false })

  if (error) {
    throw new Error(`Não foi possível carregar os dados do sensor: ${error.message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error("O Supabase retornou dados de telemetria inválidos.");
  }

  return data.map((row) => {
    if (!isRecord(row) || (typeof row.id_equipamento !== "number" && typeof row.id_equipamento !== "string")) {
      throw new Error("O Supabase retornou uma leitura com equipamento inválido.");
    }
    return {
      id_equipamento: row.id_equipamento,
      temperature: toNullableFiniteNumber(row.temperatura_float),
      humidity: toNullableFiniteNumber(row.umidade_float),
      current: toNullableFiniteNumber(row.corrente_float),
      timestamp: typeof row.timestamp === "string" ? row.timestamp : null,
    };
  });
}

export function subscribeToAccountTelemetry(
  equipmentIds: Array<number | string>,
  callback: () => void,
) {
  if (!equipmentIds.length) {
    return null;
  }

  const client = getSupabaseClient();
  const channel = client
    .channel(`cold-ghost-data-${equipmentIds.join("-")}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "Data" },
      callback,
    )
    .subscribe();

  return channel;
}

function toNullableFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
