import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.providerConfiguration.findUnique({ where: { id: "default-provider" } });
  if (!provider) return console.log("No provider found");
  
  const balanceFormData = new URLSearchParams();
  balanceFormData.append("key", provider.encryptedApiKey);
  balanceFormData.append("action", "balance");
  
  const balRes = await fetch(provider.apiUrl, { method: "POST", body: balanceFormData });
  console.log("Balance:", await balRes.json());
  
  const servicesFormData = new URLSearchParams();
  servicesFormData.append("key", provider.encryptedApiKey);
  servicesFormData.append("action", "services");
  
  const srvRes = await fetch(provider.apiUrl, { method: "POST", body: servicesFormData });
  const services = await srvRes.json();
  
  if (Array.isArray(services)) {
    const srv968 = services.find(s => String(s.service) === "968");
    console.log("Service 968 details:", srv968);
    
    const srvIds = ["971", "968", "974", "972", "969", "975", "970", "973", "976"];
    for (const id of srvIds) {
      const s = services.find(x => String(x.service) === id);
      if (s) console.log(`Service ${id}: rate=${s.rate}, min=${s.min}, max=${s.max}, name=${s.name}`);
      else console.log(`Service ${id} NOT FOUND on provider!`);
    }
  } else {
    console.log("Failed to fetch services:", services);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
