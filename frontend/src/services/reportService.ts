export function exportReport(name: string, period: string) {
  const content = [
    "Relatório FrioSentinela",
    `Período: ${period}`,
    "Equipamentos monitorados: 24",
    "Consumo total: 8.492 kWh",
    "Custo estimado: R$ 7.218",
  ].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  link.download = `${name.toLowerCase().replace(/\s+/g, "-")}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}
