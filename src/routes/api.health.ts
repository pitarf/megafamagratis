import { createFileRoute } from "@tanstack/react-router";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          // 1. Testa conexão básica com banco
          await prisma.$queryRaw`SELECT 1`;

          // 2. Testa se as tabelas foram criadas/migradas (se falhar, significa migrations pendentes)
          await prisma.systemSetting.findFirst();

          return new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("[HEALTHCHECK FAILED] Falha na validação do banco/infraestrutura:", err.message || err);
          
          return new Response(
            JSON.stringify({ 
              status: "error", 
              message: "O banco de dados está inacessível ou sem migrations." 
            }), 
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
