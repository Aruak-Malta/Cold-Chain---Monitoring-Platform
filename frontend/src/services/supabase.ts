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

export type AccountEquipmentLimit = {
  id_equipamento: number | string;
  temperatura_minima: number;
  temperatura_maxima: number;
  tolerancia_minutos: number;
  watchdog_minutos: number;
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

export async function fetchEquipmentLimits(
  equipmentIds: Array<number | string>,
): Promise<AccountEquipmentLimit[]> {
  if (!equipmentIds.length) return [];
  const { data, error } = await getSupabaseClient()
    .from("Limites")
    .select("id_equipamento, temperatura_minima, temperatura_maxima, tolerancia_minutos, watchdog_minutos")
    .in("id_equipamento", equipmentIds);
  if (error) {
    throw new Error(`Não foi possível carregar os limites dos equipamentos: ${error.message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error("O Supabase retornou limites inválidos.");
  }
  return data.map((row) => {
    if (
      !isRecord(row) ||
      (typeof row.id_equipamento !== "number" && typeof row.id_equipamento !== "string") ||
      typeof row.temperatura_minima !== "number" ||
      typeof row.temperatura_maxima !== "number"
    ) {
      throw new Error("O Supabase retornou um limite de equipamento inválido.");
    }
    return {
      id_equipamento: row.id_equipamento,
      temperatura_minima: row.temperatura_minima,
      temperatura_maxima: row.temperatura_maxima,
      tolerancia_minutos: typeof row.tolerancia_minutos === "number" ? row.tolerancia_minutos : 5,
      watchdog_minutos: typeof row.watchdog_minutos === "number" ? row.watchdog_minutos : 10,
    };
  });
}

export async function fetchCompanyEquipmentLimits(
  companyId: number | string,
): Promise<Array<AccountEquipmentLimit & { mac_address: string; nome_equipamento: string }>> {
  const { data, error } = await getSupabaseClient()
    .from("Limites")
    .select("id_equipamento, temperatura_minima, temperatura_maxima, tolerancia_minutos, watchdog_minutos, Equipamento!inner(id_company, mac_address, nome_equipamento)")
    .eq("Equipamento.id_company", companyId);
  if (error) {
    throw new Error(`Não foi possível carregar os limites da empresa: ${error.message}`);
  }
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    if (!isRecord(row) || !isRecord(row.Equipamento)) {
      throw new Error("O Supabase retornou um limite inválido.");
    }
    return {
      id_equipamento: typeof row.id_equipamento === "number" || typeof row.id_equipamento === "string"
        ? row.id_equipamento
        : 0,
      temperatura_minima: typeof row.temperatura_minima === "number" ? row.temperatura_minima : -22,
      temperatura_maxima: typeof row.temperatura_maxima === "number" ? row.temperatura_maxima : 12,
      tolerancia_minutos: typeof row.tolerancia_minutos === "number" ? row.tolerancia_minutos : 5,
      watchdog_minutos: typeof row.watchdog_minutos === "number" ? row.watchdog_minutos : 10,
      mac_address: typeof row.Equipamento.mac_address === "string" ? row.Equipamento.mac_address : "",
      nome_equipamento: typeof row.Equipamento.nome_equipamento === "string" ? row.Equipamento.nome_equipamento : "Equipamento",
    };
  });
}

export async function saveEquipmentLimits(
  equipmentId: number | string,
  limits: Omit<AccountEquipmentLimit, "id_equipamento">,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("Limites")
    .upsert({
      id_equipamento: equipmentId,
      temperatura_minima: limits.temperatura_minima,
      temperatura_maxima: limits.temperatura_maxima,
      tolerancia_minutos: limits.tolerancia_minutos,
      watchdog_minutos: limits.watchdog_minutos,
    }, { onConflict: "id_equipamento" });
  if (error) {
    throw new Error(`Não foi possível salvar os limites do equipamento: ${error.message}`);
  }
}

export type AccountStoredAlert = {
  id: number | string;
  id_equipamento: number | string;
  codigo: string;
  nivel: "critical" | "warning";
  titulo: string;
  detalhe: string;
  valor: string;
  timestamp: string | null;
  reconhecido: boolean;
};

export async function fetchAccountAlerts(
  equipmentIds: Array<number | string>,
): Promise<AccountStoredAlert[]> {
  if (!equipmentIds.length) return [];
  const { data, error } = await getSupabaseClient()
    .from("Avisos")
    .select("id_aviso, id_equipamento, codigo, nivel, titulo, detalhe, valor, timestamp, reconhecido")
    .in("id_equipamento", equipmentIds)
    .order("timestamp", { ascending: false });
  if (error) {
    throw new Error(`Não foi possível carregar os avisos persistidos: ${error.message}`);
  }
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    if (!isRecord(row)) throw new Error("O Supabase retornou um aviso inválido.");
    return {
      id: typeof row.id_aviso === "number" || typeof row.id_aviso === "string" ? row.id_aviso : String(row.codigo ?? "aviso"),
      id_equipamento: typeof row.id_equipamento === "number" || typeof row.id_equipamento === "string" ? row.id_equipamento : "",
      codigo: typeof row.codigo === "string" ? row.codigo : "aviso",
      nivel: row.nivel === "critical" ? "critical" : "warning",
      titulo: typeof row.titulo === "string" ? row.titulo : "Aviso do equipamento",
      detalhe: typeof row.detalhe === "string" ? row.detalhe : "",
      valor: typeof row.valor === "string" ? row.valor : "",
      timestamp: typeof row.timestamp === "string" ? row.timestamp : null,
      reconhecido: row.reconhecido === true,
    };
  });
}

export async function acknowledgeAccountAlerts(alertIds: Array<number | string>): Promise<void> {
  if (!alertIds.length) return;
  const { error } = await getSupabaseClient()
    .from("Avisos")
    .update({ reconhecido: true })
    .in("id_aviso", alertIds);
  if (error) {
    throw new Error(`Não foi possível reconhecer os avisos: ${error.message}`);
  }
}

export async function fetchAccountTelemetry(
  equipmentIds: Array<number | string>,
): Promise<AccountTelemetryRecord[]> {
  if (!equipmentIds.length) {
    return [];
  }

  const { data, error } = await getSupabaseClient()
    .from("Data")
    .select("*")
    .in("id_equipamento", equipmentIds)
    .limit(1000);

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
      temperature: readNumericField(row, ["temperatura_float", "temperatura", "temperature"]),
      humidity: readNumericField(row, ["umidade_float", "umidade", "humidity"]),
      current: readNumericField(row, ["corrente_float", "corrente", "current"]),
      timestamp: readTimestampField(row),
    };
  });
}

function readNumericField(row: Record<string, unknown>, candidates: string[]): number | null {
  for (const candidate of candidates) {
    const value = toNullableFiniteNumber(row[candidate]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function readTimestampField(row: Record<string, unknown>): string | null {
  for (const candidate of ["timestamp", "created_at", "time", "data_hora"]) {
    if (typeof row[candidate] === "string") {
      return row[candidate];
    }
  }
  return null;
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
