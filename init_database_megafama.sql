--
-- PostgreSQL database dump
--

\restrict 9AQstWn9t60nj1gGNv9dpNGrFNgT5Pk7kG3YGF3mUfOpEeJb7IegII0kBCfHcY9

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."RedirectEvent" DROP CONSTRAINT IF EXISTS "RedirectEvent_paidPackageId_fkey";
ALTER TABLE IF EXISTS ONLY public."RedirectEvent" DROP CONSTRAINT IF EXISTS "RedirectEvent_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public."PaidPackage" DROP CONSTRAINT IF EXISTS "PaidPackage_networkServiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Order" DROP CONSTRAINT IF EXISTS "Order_socialNetworkId_fkey";
ALTER TABLE IF EXISTS ONLY public."Order" DROP CONSTRAINT IF EXISTS "Order_serviceTypeId_fkey";
ALTER TABLE IF EXISTS ONLY public."Order" DROP CONSTRAINT IF EXISTS "Order_networkServiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Order" DROP CONSTRAINT IF EXISTS "Order_freeTrialOptionId_fkey";
ALTER TABLE IF EXISTS ONLY public."OrderStatusHistory" DROP CONSTRAINT IF EXISTS "OrderStatusHistory_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public."OrderAttempt" DROP CONSTRAINT IF EXISTS "OrderAttempt_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public."NetworkService" DROP CONSTRAINT IF EXISTS "NetworkService_socialNetworkId_fkey";
ALTER TABLE IF EXISTS ONLY public."NetworkService" DROP CONSTRAINT IF EXISTS "NetworkService_serviceTypeId_fkey";
ALTER TABLE IF EXISTS ONLY public."FreeTrialOption" DROP CONSTRAINT IF EXISTS "FreeTrialOption_networkServiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."AdminSession" DROP CONSTRAINT IF EXISTS "AdminSession_adminUserId_fkey";
DROP INDEX IF EXISTS public."SystemSetting_key_key";
DROP INDEX IF EXISTS public."SocialNetwork_slug_key";
DROP INDEX IF EXISTS public."ServiceType_slug_key";
DROP INDEX IF EXISTS public."RedirectEvent_eventType_idx";
DROP INDEX IF EXISTS public."RedirectEvent_createdAt_idx";
DROP INDEX IF EXISTS public."Order_targetHash_idx";
DROP INDEX IF EXISTS public."Order_status_idx";
DROP INDEX IF EXISTS public."Order_socialNetworkId_serviceTypeId_idx";
DROP INDEX IF EXISTS public."Order_publicId_key";
DROP INDEX IF EXISTS public."Order_providerOrderId_idx";
DROP INDEX IF EXISTS public."Order_idempotencyKey_key";
DROP INDEX IF EXISTS public."Order_createdAt_idx";
DROP INDEX IF EXISTS public."OrderStatusHistory_orderId_idx";
DROP INDEX IF EXISTS public."OrderAttempt_orderId_idx";
DROP INDEX IF EXISTS public."NetworkService_socialNetworkId_serviceTypeId_key";
DROP INDEX IF EXISTS public."FreeTrialOption_networkServiceId_quantity_key";
DROP INDEX IF EXISTS public."BlockedTarget_socialNetworkId_targetHash_key";
DROP INDEX IF EXISTS public."AuditLog_createdAt_idx";
DROP INDEX IF EXISTS public."AdminUser_email_key";
DROP INDEX IF EXISTS public."AdminSession_tokenHash_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."SystemSetting" DROP CONSTRAINT IF EXISTS "SystemSetting_pkey";
ALTER TABLE IF EXISTS ONLY public."SocialNetwork" DROP CONSTRAINT IF EXISTS "SocialNetwork_pkey";
ALTER TABLE IF EXISTS ONLY public."ServiceType" DROP CONSTRAINT IF EXISTS "ServiceType_pkey";
ALTER TABLE IF EXISTS ONLY public."RedirectEvent" DROP CONSTRAINT IF EXISTS "RedirectEvent_pkey";
ALTER TABLE IF EXISTS ONLY public."RateLimit" DROP CONSTRAINT IF EXISTS "RateLimit_pkey";
ALTER TABLE IF EXISTS ONLY public."ProviderConfiguration" DROP CONSTRAINT IF EXISTS "ProviderConfiguration_pkey";
ALTER TABLE IF EXISTS ONLY public."PaidPackage" DROP CONSTRAINT IF EXISTS "PaidPackage_pkey";
ALTER TABLE IF EXISTS ONLY public."Order" DROP CONSTRAINT IF EXISTS "Order_pkey";
ALTER TABLE IF EXISTS ONLY public."OrderStatusHistory" DROP CONSTRAINT IF EXISTS "OrderStatusHistory_pkey";
ALTER TABLE IF EXISTS ONLY public."OrderAttempt" DROP CONSTRAINT IF EXISTS "OrderAttempt_pkey";
ALTER TABLE IF EXISTS ONLY public."NetworkService" DROP CONSTRAINT IF EXISTS "NetworkService_pkey";
ALTER TABLE IF EXISTS ONLY public."FreeTrialOption" DROP CONSTRAINT IF EXISTS "FreeTrialOption_pkey";
ALTER TABLE IF EXISTS ONLY public."BlockedTarget" DROP CONSTRAINT IF EXISTS "BlockedTarget_pkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";
ALTER TABLE IF EXISTS ONLY public."AdminUser" DROP CONSTRAINT IF EXISTS "AdminUser_pkey";
ALTER TABLE IF EXISTS ONLY public."AdminSession" DROP CONSTRAINT IF EXISTS "AdminSession_pkey";
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."SystemSetting";
DROP TABLE IF EXISTS public."SocialNetwork";
DROP TABLE IF EXISTS public."ServiceType";
DROP TABLE IF EXISTS public."RedirectEvent";
DROP TABLE IF EXISTS public."RateLimit";
DROP TABLE IF EXISTS public."ProviderConfiguration";
DROP TABLE IF EXISTS public."PaidPackage";
DROP TABLE IF EXISTS public."OrderStatusHistory";
DROP TABLE IF EXISTS public."OrderAttempt";
DROP TABLE IF EXISTS public."Order";
DROP TABLE IF EXISTS public."NetworkService";
DROP TABLE IF EXISTS public."FreeTrialOption";
DROP TABLE IF EXISTS public."BlockedTarget";
DROP TABLE IF EXISTS public."AuditLog";
DROP TABLE IF EXISTS public."AdminUser";
DROP TABLE IF EXISTS public."AdminSession";
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AdminSession; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminSession" (
    id text NOT NULL,
    "adminUserId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipHash" text NOT NULL,
    "userAgentHash" text NOT NULL
);


ALTER TABLE public."AdminSession" OWNER TO postgres;

--
-- Name: AdminUser; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminUser" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastLoginAt" timestamp(3) without time zone
);


ALTER TABLE public."AdminUser" OWNER TO postgres;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "adminUserId" text,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "previousData" text,
    "newData" text,
    "ipHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: BlockedTarget; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BlockedTarget" (
    id text NOT NULL,
    "socialNetworkId" text NOT NULL,
    "targetHash" text NOT NULL,
    reason text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByAdminId" text
);


ALTER TABLE public."BlockedTarget" OWNER TO postgres;

--
-- Name: FreeTrialOption; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FreeTrialOption" (
    id text NOT NULL,
    "networkServiceId" text NOT NULL,
    quantity integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "dailyLimit" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FreeTrialOption" OWNER TO postgres;

--
-- Name: NetworkService; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."NetworkService" (
    id text NOT NULL,
    "socialNetworkId" text NOT NULL,
    "serviceTypeId" text NOT NULL,
    "providerServiceId" text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "unitCost" double precision DEFAULT 0.0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."NetworkService" OWNER TO postgres;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "publicId" text NOT NULL,
    "socialNetworkId" text NOT NULL,
    "serviceTypeId" text NOT NULL,
    "networkServiceId" text NOT NULL,
    "freeTrialOptionId" text,
    quantity integer NOT NULL,
    "originalTarget" text NOT NULL,
    "normalizedTarget" text NOT NULL,
    "targetHash" text NOT NULL,
    status text NOT NULL,
    "providerOrderId" text,
    "providerResponseSummary" text,
    "recordedCost" double precision DEFAULT 0.0 NOT NULL,
    "idempotencyKey" text NOT NULL,
    "campaignSource" text,
    "sessionIdentifier" text NOT NULL,
    "ipHash" text NOT NULL,
    "attemptsCount" integer DEFAULT 0 NOT NULL,
    "errorCode" text,
    "errorMessage" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public."Order" OWNER TO postgres;

--
-- Name: OrderAttempt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OrderAttempt" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "attemptNumber" integer NOT NULL,
    "providerOrderId" text,
    status text NOT NULL,
    "requestSummary" text,
    "responseSummary" text,
    "recordedCost" double precision DEFAULT 0.0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public."OrderAttempt" OWNER TO postgres;

--
-- Name: OrderStatusHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OrderStatusHistory" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "previousStatus" text NOT NULL,
    "newStatus" text NOT NULL,
    reason text NOT NULL,
    "changedByAdminId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OrderStatusHistory" OWNER TO postgres;

--
-- Name: PaidPackage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PaidPackage" (
    id text NOT NULL,
    "networkServiceId" text NOT NULL,
    name text NOT NULL,
    quantity integer NOT NULL,
    price double precision NOT NULL,
    "promotionalPrice" double precision,
    description text NOT NULL,
    badge text,
    "redirectUrl" text NOT NULL,
    "campaignParameters" text,
    active boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "badgeVariant" text DEFAULT 'default'::text NOT NULL
);


ALTER TABLE public."PaidPackage" OWNER TO postgres;

--
-- Name: ProviderConfiguration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProviderConfiguration" (
    id text NOT NULL,
    "providerName" text DEFAULT 'Duke Fornecedor'::text NOT NULL,
    "apiUrl" text NOT NULL,
    "encryptedApiKey" text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProviderConfiguration" OWNER TO postgres;

--
-- Name: RateLimit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RateLimit" (
    key text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "blockedUntil" timestamp(3) without time zone,
    "lastAttempt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RateLimit" OWNER TO postgres;

--
-- Name: RedirectEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RedirectEvent" (
    id text NOT NULL,
    "orderId" text,
    "paidPackageId" text NOT NULL,
    "eventType" text NOT NULL,
    "sessionIdentifier" text NOT NULL,
    "campaignSource" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RedirectEvent" OWNER TO postgres;

--
-- Name: ServiceType; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceType" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public."ServiceType" OWNER TO postgres;

--
-- Name: SocialNetwork; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SocialNetwork" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SocialNetwork" OWNER TO postgres;

--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SystemSetting" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    visibility text DEFAULT 'private'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SystemSetting" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: AdminSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminSession" (id, "adminUserId", "tokenHash", "expiresAt", "revokedAt", "createdAt", "ipHash", "userAgentHash") FROM stdin;
06ebe973-4df2-4216-b488-a94e17cdf940	09b008ad-fc2d-40d1-9476-2c75e452c34a	4eaaaff06775d3671f5ccd304fbb04aaf80c4a8e43150b80d3692c752095e8b4	2026-07-03 14:44:44.045	\N	2026-07-03 14:44:45.041	ip_hash_1	ua_hash_1
21ad00f4-a73d-4f61-9471-e43a2dc1ba84	09b008ad-fc2d-40d1-9476-2c75e452c34a	656a4d514158bca4079669fcd0d97db8276e936ea6aa5b38902998e782462a4a	2026-07-03 17:22:50.56	\N	2026-07-03 15:22:50.561	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	6235d36597d64fc0e0c3883911a8fb2f9451d0254ab3379d980f5a3426585d87
d9d2d1c3-9210-42b7-a7e8-11bf204d326b	09b008ad-fc2d-40d1-9476-2c75e452c34a	e090526f0f1eaf71188c417b10cf6f398431954377b28d42fe7fee310da94c52	2026-07-03 17:23:23.226	\N	2026-07-03 15:23:23.228	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	6235d36597d64fc0e0c3883911a8fb2f9451d0254ab3379d980f5a3426585d87
20a7f4fc-3eb1-4b1a-816d-e4196f38106e	09b008ad-fc2d-40d1-9476-2c75e452c34a	072c189ccea9098a3281158410014024f1e6182afeeab1569bbe923e4568c574	2026-07-03 17:23:51.222	\N	2026-07-03 15:23:51.223	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	6235d36597d64fc0e0c3883911a8fb2f9451d0254ab3379d980f5a3426585d87
3cc5767d-187f-4655-b492-e7ca2115a202	09b008ad-fc2d-40d1-9476-2c75e452c34a	c2d8c9aac5af84ebb7e9727bf2dd716b2d4c0fe41d10c662138fd3c8b0fac192	2026-07-03 22:10:23.667	\N	2026-07-03 20:10:23.668	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	8701240454c90b2df29494afeb42494e58f77041bf8d7482e14b866fd821288c
abed977c-545b-4091-8a1a-15f954d662c4	09b008ad-fc2d-40d1-9476-2c75e452c34a	68f4328f29738cc427cb6ac3b0f8e1a9b63edab889a84616d63913601e96fd5c	2026-07-03 22:10:25.948	\N	2026-07-03 20:10:25.95	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	8701240454c90b2df29494afeb42494e58f77041bf8d7482e14b866fd821288c
a10e4980-c70d-4540-b0b9-e48728cbca6e	09b008ad-fc2d-40d1-9476-2c75e452c34a	169f1b460ba8b73dff355a8dc586d521f52f5f41fd16276cab703f914337a1f0	2026-07-03 22:10:30.403	\N	2026-07-03 20:10:30.404	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	8701240454c90b2df29494afeb42494e58f77041bf8d7482e14b866fd821288c
f7428a19-b99d-41e4-8671-73595b3bc66f	09b008ad-fc2d-40d1-9476-2c75e452c34a	bba65adce59329acbf9bbf53247ea11d585c7297bc62edcb6978d11b50ccc301	2026-07-03 22:29:12.64	\N	2026-07-03 20:29:12.642	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	8f5a02445266838a0004fc486f97d648e4d457e9f5f6a879e54668ed0298ec14
ccad37e0-0fc2-4d4b-bfb2-fd53b37be903	09b008ad-fc2d-40d1-9476-2c75e452c34a	3308e4a0c46ac77498f7a078edf8f43025da72d770a5e75f3324047e31d3ac7f	2026-07-03 22:29:17.931	\N	2026-07-03 20:29:17.933	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	8f5a02445266838a0004fc486f97d648e4d457e9f5f6a879e54668ed0298ec14
28546bca-4988-419a-b883-2c99c30d4d38	09b008ad-fc2d-40d1-9476-2c75e452c34a	2981002311132ccafb9575e72f634b14e85062a4af1cb740990d6608ff50df28	2026-07-03 22:29:18.928	\N	2026-07-03 20:29:18.929	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	8f5a02445266838a0004fc486f97d648e4d457e9f5f6a879e54668ed0298ec14
4c9a928a-5173-4bf1-8548-ceca67e09868	09b008ad-fc2d-40d1-9476-2c75e452c34a	8383ff3ba3353d63db59b998a7bafbd5b8f7ab62b1d82d1f00554c4935179df4	2026-07-03 22:29:22.505	\N	2026-07-03 20:29:22.506	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	8f5a02445266838a0004fc486f97d648e4d457e9f5f6a879e54668ed0298ec14
a2226114-ceaa-4724-810e-7caf9cf18018	09b008ad-fc2d-40d1-9476-2c75e452c34a	5b333dd7cfb276f51e79204e6b23903f1d7eddf28f5fecd99767d2e936a7136b	2026-07-03 22:29:24.038	\N	2026-07-03 20:29:24.04	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	8f5a02445266838a0004fc486f97d648e4d457e9f5f6a879e54668ed0298ec14
2204971b-e1bb-46df-8a8e-3862869c1a8d	09b008ad-fc2d-40d1-9476-2c75e452c34a	76f078e688829417c0c70fa0206596ba8adc4c91676be2ccea4e8d6bff490d04	2026-07-03 22:29:30.402	\N	2026-07-03 20:29:30.403	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	8f5a02445266838a0004fc486f97d648e4d457e9f5f6a879e54668ed0298ec14
98ff0476-bc2b-4584-b78f-341ee5a90969	09b008ad-fc2d-40d1-9476-2c75e452c34a	9d3227482512fd4d7c8cad43e591a21fa68fd2b304d15efe7d264a3e7348cbf7	2026-07-03 22:38:35.205	\N	2026-07-03 20:38:35.207	unknown	unknown
ae982a2f-90fb-4be1-a61d-45f73a89aaf8	09b008ad-fc2d-40d1-9476-2c75e452c34a	d8918fa278a3a490b406da5f166a13691b560600c03f078258a7dd66d526411e	2026-07-03 22:42:30.419	\N	2026-07-03 20:42:30.421	eea6a61e73c937fb19b2a930430ddae0b68178d0302e82806b0ed62f3e6b639b	2a2bdcbbbbdb448ef2960de5500fffa6f04c182b3f6b990a2b179a5ce95e0e9b
\.


--
-- Data for Name: AdminUser; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminUser" (id, email, "passwordHash", active, "createdAt", "updatedAt", "lastLoginAt") FROM stdin;
09b008ad-fc2d-40d1-9476-2c75e452c34a	admin@megafama.com	$2b$12$LhwSmNe1F9NNGiHmQSS8U.1835iUsRxnXVDk3tIrQh.GRlmc0Knna	t	2026-07-03 14:44:44.368	2026-07-03 20:42:30.425	2026-07-03 20:42:30.424
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, "adminUserId", action, "entityType", "entityId", "previousData", "newData", "ipHash", "createdAt") FROM stdin;
26576a8d-a201-4573-868e-de9769b4f06c	7dfdbb0b-c976-4e64-8905-2cd156495b72	retry_order	Order	142da60f-be0b-43c7-8bf5-b120d8ba8a5c	\N	{"providerOrderId":"998877"}	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	2026-07-03 14:43:51.586
1f798987-daae-4683-8a71-ca95211c8337	d51a0b9a-6ff6-4523-a835-cf2ba9883424	retry_order	Order	80260910-7cbb-4c53-8462-1e0c4264ec8c	\N	{"providerOrderId":"998877"}	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	2026-07-03 14:44:45.076
\.


--
-- Data for Name: BlockedTarget; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BlockedTarget" (id, "socialNetworkId", "targetHash", reason, active, "createdAt", "createdByAdminId") FROM stdin;
d26ed441-d4c1-4bed-be1e-874d48d66895	2bef64f6-520d-4bc2-8a12-406a562e0676	hash_migrado_123	Legacy migration block	t	2026-07-03 14:44:40.831	\N
2e0bd020-2db6-435a-994a-de03ff5a1c5f	2bef64f6-520d-4bc2-8a12-406a562e0676	dd7abf42588b29fb2fef42c5f96f7faefc1b836c2e0640d4d6c62c240da15ac9	Pedido em andamento: key_trial_1	t	2026-07-03 14:44:44.39	\N
b691de7f-aadb-4f49-8759-7982cc398a94	2bef64f6-520d-4bc2-8a12-406a562e0676	ad7f7b8cf9bd46c0ca2f70e23cc6f0a4681482dc99c6522836608e3505bea0f3	Pedido em andamento: concur_key_1	t	2026-07-03 14:44:44.452	\N
bc15c25e-80e3-4c9f-baae-28f8e7318d87	2bef64f6-520d-4bc2-8a12-406a562e0676	afa67dad7b17270663b00328e134b9f76c4655dfd99850627541240a1dee5bf1	Pedido em andamento: idem_key_unique	t	2026-07-03 14:44:44.511	\N
\.


--
-- Data for Name: FreeTrialOption; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FreeTrialOption" (id, "networkServiceId", quantity, active, "displayOrder", "dailyLimit", "createdAt", "updatedAt") FROM stdin;
c8e6a3ee-d1c5-43d4-ada9-cf03ff838e54	dab98fa2-102a-4f26-934a-4efb3d2abeb4	100	t	0	\N	2026-07-03 20:43:42.954	2026-07-03 20:43:42.954
afa534a3-7ed4-4eca-a1ac-ead08749407a	48b5e0e6-e1fc-4a23-8356-5037f6c96a86	10	t	0	\N	2026-07-03 14:44:40.826	2026-07-03 20:43:54.658
ab385705-1990-47c2-9ba4-9a16caf87dbd	215cd63e-8808-49ca-9813-3d7e877a7d70	10	t	0	\N	2026-07-03 14:44:40.825	2026-07-03 20:44:03.546
5e6bfb5c-a510-4178-af98-508331eb26a7	cc6b8ac0-d843-4301-a985-430d82ac2ba4	10	t	0	\N	2026-07-03 20:44:18.328	2026-07-03 20:44:18.328
d9df42ec-0513-45fd-8bf3-9f1c13cb5695	4f7c74f0-08fa-42e2-8c14-d1c17eea9a88	10	t	0	\N	2026-07-03 20:44:54.105	2026-07-03 20:44:54.105
5c9e4333-827d-4b0e-ab4e-5375dc3b32bb	80052cd0-fc37-4959-90b2-e1a345daa50b	100	t	0	\N	2026-07-03 20:45:06.265	2026-07-03 20:45:06.265
cde4aa93-1c84-4098-bf08-2a6158531486	ea011f2e-7075-45a6-9a83-fb446a4fcc70	10	t	0	\N	2026-07-03 20:45:20.338	2026-07-03 20:45:20.338
da56efe8-1118-4cd0-a180-85913c6b11f0	648330cd-be1c-439f-98d8-aca7db3a44e3	10	t	0	\N	2026-07-03 20:45:32.608	2026-07-03 20:45:32.608
8852f9f9-2ec1-4c63-a5d3-eabbe0604d96	3989af1c-9f9c-44f1-ae1e-dc4ed1879fbe	10	t	0	\N	2026-07-03 20:45:43.829	2026-07-03 20:45:43.829
\.


--
-- Data for Name: NetworkService; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NetworkService" (id, "socialNetworkId", "serviceTypeId", "providerServiceId", active, "unitCost", "createdAt", "updatedAt") FROM stdin;
dab98fa2-102a-4f26-934a-4efb3d2abeb4	2bef64f6-520d-4bc2-8a12-406a562e0676	3797c5b2-987d-4f6e-bd87-8a6e35a4a099	379	t	0	2026-07-03 20:43:42.949	2026-07-03 20:43:42.949
48b5e0e6-e1fc-4a23-8356-5037f6c96a86	2bef64f6-520d-4bc2-8a12-406a562e0676	c4a2ce21-800c-4eb3-b49c-d5b06cfc0de2	376	t	0	2026-07-03 14:44:40.824	2026-07-03 20:43:54.655
215cd63e-8808-49ca-9813-3d7e877a7d70	2bef64f6-520d-4bc2-8a12-406a562e0676	bfc67e46-9577-4438-a2af-37f1d880e29f	944	t	0	2026-07-03 14:44:40.823	2026-07-03 20:44:03.543
cc6b8ac0-d843-4301-a985-430d82ac2ba4	f980771e-26a6-43f9-bfe3-c12bace03334	bfc67e46-9577-4438-a2af-37f1d880e29f	899	t	0	2026-07-03 20:44:18.325	2026-07-03 20:44:18.325
4f7c74f0-08fa-42e2-8c14-d1c17eea9a88	f980771e-26a6-43f9-bfe3-c12bace03334	c4a2ce21-800c-4eb3-b49c-d5b06cfc0de2	469	t	0	2026-07-03 20:44:54.103	2026-07-03 20:44:54.103
80052cd0-fc37-4959-90b2-e1a345daa50b	f980771e-26a6-43f9-bfe3-c12bace03334	3797c5b2-987d-4f6e-bd87-8a6e35a4a099	470	t	0	2026-07-03 20:45:06.261	2026-07-03 20:45:06.261
ea011f2e-7075-45a6-9a83-fb446a4fcc70	2854445c-724f-41a8-a6ad-a8c61b8baf32	bfc67e46-9577-4438-a2af-37f1d880e29f	591	t	0	2026-07-03 20:45:20.335	2026-07-03 20:45:20.335
648330cd-be1c-439f-98d8-aca7db3a44e3	2854445c-724f-41a8-a6ad-a8c61b8baf32	c4a2ce21-800c-4eb3-b49c-d5b06cfc0de2	594	t	0	2026-07-03 20:45:32.605	2026-07-03 20:45:32.605
3989af1c-9f9c-44f1-ae1e-dc4ed1879fbe	2854445c-724f-41a8-a6ad-a8c61b8baf32	3797c5b2-987d-4f6e-bd87-8a6e35a4a099	600	t	0	2026-07-03 20:45:43.826	2026-07-03 20:45:43.826
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Order" (id, "publicId", "socialNetworkId", "serviceTypeId", "networkServiceId", "freeTrialOptionId", quantity, "originalTarget", "normalizedTarget", "targetHash", status, "providerOrderId", "providerResponseSummary", "recordedCost", "idempotencyKey", "campaignSource", "sessionIdentifier", "ipHash", "attemptsCount", "errorCode", "errorMessage", "createdAt", "updatedAt", "completedAt") FROM stdin;
e855a427-23f7-46b3-a626-2d4ab9fc2f74	e855a427-23f7-46b3-a626-2d4ab9fc2f74	2bef64f6-520d-4bc2-8a12-406a562e0676	bfc67e46-9577-4438-a2af-37f1d880e29f	215cd63e-8808-49ca-9813-3d7e877a7d70	\N	10	@usuario_migrado	@usuario_migrado	hash_migrado_123	completed	112233	\N	0.05	e855a427-23f7-46b3-a626-2d4ab9fc2f74	\N	legacy_session	legacy_ip_hash	1	\N	\N	2026-07-03 14:44:40.831	2026-07-03 14:44:42.289	2026-07-03 14:44:42.287
38c3c737-0bac-4d97-a9d2-6b4847f7b2a8	85f4dd95-d3c4-4193-91a0-5ef4bf6e8084	2bef64f6-520d-4bc2-8a12-406a562e0676	bfc67e46-9577-4438-a2af-37f1d880e29f	215cd63e-8808-49ca-9813-3d7e877a7d70	ab385705-1990-47c2-9ba4-9a16caf87dbd	10	@alvo_teste_gratis	profile:instagram:alvo_teste_gratis	dd7abf42588b29fb2fef42c5f96f7faefc1b836c2e0640d4d6c62c240da15ac9	completed	998877	\N	0	key_trial_1	\N	sess_trial_1	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	1	\N	\N	2026-07-03 14:44:44.391	2026-07-03 14:44:44.396	2026-07-03 14:44:44.395
6af666b5-5f7a-45e2-b1b1-ab7bb5d8402e	5820429b-a596-4cf7-b78d-a83af2b84e54	2bef64f6-520d-4bc2-8a12-406a562e0676	bfc67e46-9577-4438-a2af-37f1d880e29f	215cd63e-8808-49ca-9813-3d7e877a7d70	ab385705-1990-47c2-9ba4-9a16caf87dbd	10	@alvo_concorrente	profile:instagram:alvo_concorrente	ad7f7b8cf9bd46c0ca2f70e23cc6f0a4681482dc99c6522836608e3505bea0f3	completed	998877	\N	0	concur_key_1	\N	sess_trial_1	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	1	\N	\N	2026-07-03 14:44:44.453	2026-07-03 14:44:44.458	2026-07-03 14:44:44.457
c3992207-e85a-4128-b416-6eb28e99d79b	b8184355-22c0-418e-931d-f0c4cae0f856	2bef64f6-520d-4bc2-8a12-406a562e0676	bfc67e46-9577-4438-a2af-37f1d880e29f	215cd63e-8808-49ca-9813-3d7e877a7d70	ab385705-1990-47c2-9ba4-9a16caf87dbd	10	@alvo_idempotente	profile:instagram:alvo_idempotente	afa67dad7b17270663b00328e134b9f76c4655dfd99850627541240a1dee5bf1	completed	998877	\N	0	idem_key_unique	\N	sess_trial_1	9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	1	\N	\N	2026-07-03 14:44:44.512	2026-07-03 14:44:44.516	2026-07-03 14:44:44.514
80260910-7cbb-4c53-8462-1e0c4264ec8c	fde03fbc-47aa-4f65-8764-b84eea1ffec2	2bef64f6-520d-4bc2-8a12-406a562e0676	bfc67e46-9577-4438-a2af-37f1d880e29f	215cd63e-8808-49ca-9813-3d7e877a7d70	\N	10	@alvo_falho	profile:instagram:alvo_falho	hash_falho	completed	998877	\N	0	failed_idem_key	\N	sess_1	ip_1	1	\N	\N	2026-07-03 14:44:45.049	2026-07-03 14:44:45.071	2026-07-03 14:44:45.07
\.


--
-- Data for Name: OrderAttempt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrderAttempt" (id, "orderId", "attemptNumber", "providerOrderId", status, "requestSummary", "responseSummary", "recordedCost", "createdAt", "completedAt") FROM stdin;
bd1110a1-3146-4c3d-b2dc-0ad8c861446d	38c3c737-0bac-4d97-a9d2-6b4847f7b2a8	1	998877	completed	key=key_importada_123&action=add&service=777&link=%40alvo_teste_gratis&quantity=10	{"order":998877}	0	2026-07-03 14:44:44.397	\N
355daec3-a8e4-43c6-8aa6-642dc789b7b5	6af666b5-5f7a-45e2-b1b1-ab7bb5d8402e	1	998877	completed	key=key_importada_123&action=add&service=777&link=%40alvo_concorrente&quantity=10	{"order":998877}	0	2026-07-03 14:44:44.46	\N
66fb5212-2461-4049-8d7e-664a55db8fc8	c3992207-e85a-4128-b416-6eb28e99d79b	1	998877	completed	key=key_importada_123&action=add&service=777&link=%40alvo_idempotente&quantity=10	{"order":998877}	0	2026-07-03 14:44:44.517	\N
1a54708b-fcbc-482d-a63e-32c9ba630ffa	80260910-7cbb-4c53-8462-1e0c4264ec8c	1	998877	completed	key=key_importada_123&action=add&service=777&link=%40alvo_falho&quantity=10	{"order":998877}	0	2026-07-03 14:44:45.073	\N
\.


--
-- Data for Name: OrderStatusHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrderStatusHistory" (id, "orderId", "previousStatus", "newStatus", reason, "changedByAdminId", "createdAt") FROM stdin;
487bfc9b-8cba-4733-afd3-2905d73a8cc4	38c3c737-0bac-4d97-a9d2-6b4847f7b2a8	pending	processing	Solicitação recebida, iniciando despacho ao provedor SMM.	\N	2026-07-03 14:44:44.394
564c9d47-d24c-4a1a-aa78-add7d2812cbd	38c3c737-0bac-4d97-a9d2-6b4847f7b2a8	processing	completed	Despacho efetuado com sucesso. ID SMM: 998877	\N	2026-07-03 14:44:44.399
fbb215a7-d211-4bb5-941f-37be6b2765df	6af666b5-5f7a-45e2-b1b1-ab7bb5d8402e	pending	processing	Solicitação recebida, iniciando despacho ao provedor SMM.	\N	2026-07-03 14:44:44.455
c2e42034-2e30-4354-9fbc-c06717f655a0	6af666b5-5f7a-45e2-b1b1-ab7bb5d8402e	processing	completed	Despacho efetuado com sucesso. ID SMM: 998877	\N	2026-07-03 14:44:44.461
5bf33988-95ee-48ad-a0c3-3a5a1650af4f	c3992207-e85a-4128-b416-6eb28e99d79b	pending	processing	Solicitação recebida, iniciando despacho ao provedor SMM.	\N	2026-07-03 14:44:44.514
774604a5-a52f-46cb-87f2-1b5c9972aa13	c3992207-e85a-4128-b416-6eb28e99d79b	processing	completed	Despacho efetuado com sucesso. ID SMM: 998877	\N	2026-07-03 14:44:44.518
8630bcd7-1373-43cd-9e06-fea5ea3fed9f	80260910-7cbb-4c53-8462-1e0c4264ec8c	failed	processing	Reenvio administrativo (Tentativa #1)	d51a0b9a-6ff6-4523-a835-cf2ba9883424	2026-07-03 14:44:45.07
a1073fc2-573c-4ce5-9208-6eef1306efbf	80260910-7cbb-4c53-8462-1e0c4264ec8c	processing	completed	Reenvio concluído com sucesso. ID SMM: 998877	d51a0b9a-6ff6-4523-a835-cf2ba9883424	2026-07-03 14:44:45.074
\.


--
-- Data for Name: PaidPackage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaidPackage" (id, "networkServiceId", name, quantity, price, "promotionalPrice", description, badge, "redirectUrl", "campaignParameters", active, "displayOrder", "createdAt", "updatedAt", "badgeVariant") FROM stdin;
pkg-insta-likes-test	48b5e0e6-e1fc-4a23-8356-5037f6c96a86	Curtidas Teste	100	5.99	\N	Curtidas reais	\N	https://checkout.megafama.net	\N	t	0	2026-07-03 14:44:45.093	2026-07-03 14:44:45.093	default
\.


--
-- Data for Name: ProviderConfiguration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProviderConfiguration" (id, "providerName", "apiUrl", "encryptedApiKey", active, "createdAt", "updatedAt") FROM stdin;
default-provider	Duke Fornecedor	https://dukefornecedor.com/api/v2	key_importada_123	t	2026-07-03 14:44:40.831	2026-07-03 14:44:43.875
\.


--
-- Data for Name: RateLimit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RateLimit" (key, attempts, "blockedUntil", "lastAttempt") FROM stdin;
submit_order:9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	1	\N	2026-07-03 14:44:44.521
login_admin:9230d4e832438a625a1e5a8fae3e7418a6b879bbbc664b7c8dd70e8c6c69923e	3	2026-07-03 20:35:37.811	2026-07-03 20:34:37.811
\.


--
-- Data for Name: RedirectEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RedirectEvent" (id, "orderId", "paidPackageId", "eventType", "sessionIdentifier", "campaignSource", "createdAt") FROM stdin;
596d85fa-8298-48ad-8d21-e44ada64ed08	\N	pkg-insta-likes-test	click	sess_metric_1	\N	2026-07-03 14:44:45.108
\.


--
-- Data for Name: ServiceType; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceType" (id, slug, name, active) FROM stdin;
bfc67e46-9577-4438-a2af-37f1d880e29f	followers	Seguidores	t
c4a2ce21-800c-4eb3-b49c-d5b06cfc0de2	likes	Curtidas	t
3797c5b2-987d-4f6e-bd87-8a6e35a4a099	views	Views	t
\.


--
-- Data for Name: SocialNetwork; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SocialNetwork" (id, slug, name, active, "displayOrder", "createdAt", "updatedAt") FROM stdin;
2bef64f6-520d-4bc2-8a12-406a562e0676	instagram	Instagram	t	1	2026-07-03 14:44:40.82	2026-07-03 14:44:40.82
f980771e-26a6-43f9-bfe3-c12bace03334	tiktok	TikTok	t	2	2026-07-03 14:44:44.115	2026-07-03 14:44:44.115
2854445c-724f-41a8-a6ad-a8c61b8baf32	kwai	Kwai	t	3	2026-07-03 14:44:44.117	2026-07-03 14:44:44.117
\.


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SystemSetting" (id, key, value, visibility, "createdAt", "updatedAt") FROM stdin;
97092be9-baff-4823-900c-5c785e7f0500	siteTitle	Título Importado	public	2026-07-03 14:44:40.828	2026-07-03 14:44:43.867
b71331bc-ab85-4a1d-8cf9-4ebe98dad3b9	siteDescription	Descrição Importada	public	2026-07-03 14:44:42.269	2026-07-03 14:44:43.871
cc4b038b-ce05-4dcf-8781-fe9cbd7a0727	testCampaignActive	true	public	2026-07-03 14:44:40.829	2026-07-03 14:44:43.873
da695064-9daa-42e5-b8a4-40f766a98991	dailyGlobalLimit	100	public	2026-07-03 14:44:40.83	2026-07-03 14:44:43.874
8590f635-321d-48cb-a57d-40c2078a7e39	faviconUrl	/favicon.ico	public	2026-07-03 14:44:44.103	2026-07-03 14:44:44.103
beabbdde-33e5-4d28-bb07-79c5bafa2862	whatsappNumber		public	2026-07-03 14:44:44.108	2026-07-03 14:44:44.108
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
1d086619-8e54-45d3-b3aa-642203e4dabe	a83b36061da21395acee2669f2a69e04a1c72669a794e8b119566853f53d7f4a	2026-07-03 11:42:15.961452-03	20260703144215_init	\N	\N	2026-07-03 11:42:15.874816-03	1
43c428c9-9417-4d27-b7f0-acec5eb748ab	33d9ed5132f53dc548fdeae8576d2ea7adb84037718391d008658879e10a67b6	2026-07-03 11:43:05.174709-03	20260703144305_add_badge_variant	\N	\N	2026-07-03 11:43:05.152825-03	1
\.


--
-- Name: AdminSession AdminSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminSession"
    ADD CONSTRAINT "AdminSession_pkey" PRIMARY KEY (id);


--
-- Name: AdminUser AdminUser_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminUser"
    ADD CONSTRAINT "AdminUser_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BlockedTarget BlockedTarget_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BlockedTarget"
    ADD CONSTRAINT "BlockedTarget_pkey" PRIMARY KEY (id);


--
-- Name: FreeTrialOption FreeTrialOption_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FreeTrialOption"
    ADD CONSTRAINT "FreeTrialOption_pkey" PRIMARY KEY (id);


--
-- Name: NetworkService NetworkService_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NetworkService"
    ADD CONSTRAINT "NetworkService_pkey" PRIMARY KEY (id);


--
-- Name: OrderAttempt OrderAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderAttempt"
    ADD CONSTRAINT "OrderAttempt_pkey" PRIMARY KEY (id);


--
-- Name: OrderStatusHistory OrderStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderStatusHistory"
    ADD CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: PaidPackage PaidPackage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaidPackage"
    ADD CONSTRAINT "PaidPackage_pkey" PRIMARY KEY (id);


--
-- Name: ProviderConfiguration ProviderConfiguration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProviderConfiguration"
    ADD CONSTRAINT "ProviderConfiguration_pkey" PRIMARY KEY (id);


--
-- Name: RateLimit RateLimit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RateLimit"
    ADD CONSTRAINT "RateLimit_pkey" PRIMARY KEY (key);


--
-- Name: RedirectEvent RedirectEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RedirectEvent"
    ADD CONSTRAINT "RedirectEvent_pkey" PRIMARY KEY (id);


--
-- Name: ServiceType ServiceType_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceType"
    ADD CONSTRAINT "ServiceType_pkey" PRIMARY KEY (id);


--
-- Name: SocialNetwork SocialNetwork_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SocialNetwork"
    ADD CONSTRAINT "SocialNetwork_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AdminSession_tokenHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON public."AdminSession" USING btree ("tokenHash");


--
-- Name: AdminUser_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AdminUser_email_key" ON public."AdminUser" USING btree (email);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: BlockedTarget_socialNetworkId_targetHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "BlockedTarget_socialNetworkId_targetHash_key" ON public."BlockedTarget" USING btree ("socialNetworkId", "targetHash");


--
-- Name: FreeTrialOption_networkServiceId_quantity_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "FreeTrialOption_networkServiceId_quantity_key" ON public."FreeTrialOption" USING btree ("networkServiceId", quantity);


--
-- Name: NetworkService_socialNetworkId_serviceTypeId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "NetworkService_socialNetworkId_serviceTypeId_key" ON public."NetworkService" USING btree ("socialNetworkId", "serviceTypeId");


--
-- Name: OrderAttempt_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OrderAttempt_orderId_idx" ON public."OrderAttempt" USING btree ("orderId");


--
-- Name: OrderStatusHistory_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OrderStatusHistory_orderId_idx" ON public."OrderStatusHistory" USING btree ("orderId");


--
-- Name: Order_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_createdAt_idx" ON public."Order" USING btree ("createdAt");


--
-- Name: Order_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON public."Order" USING btree ("idempotencyKey");


--
-- Name: Order_providerOrderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_providerOrderId_idx" ON public."Order" USING btree ("providerOrderId");


--
-- Name: Order_publicId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Order_publicId_key" ON public."Order" USING btree ("publicId");


--
-- Name: Order_socialNetworkId_serviceTypeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_socialNetworkId_serviceTypeId_idx" ON public."Order" USING btree ("socialNetworkId", "serviceTypeId");


--
-- Name: Order_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_status_idx" ON public."Order" USING btree (status);


--
-- Name: Order_targetHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_targetHash_idx" ON public."Order" USING btree ("targetHash");


--
-- Name: RedirectEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RedirectEvent_createdAt_idx" ON public."RedirectEvent" USING btree ("createdAt");


--
-- Name: RedirectEvent_eventType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RedirectEvent_eventType_idx" ON public."RedirectEvent" USING btree ("eventType");


--
-- Name: ServiceType_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ServiceType_slug_key" ON public."ServiceType" USING btree (slug);


--
-- Name: SocialNetwork_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SocialNetwork_slug_key" ON public."SocialNetwork" USING btree (slug);


--
-- Name: SystemSetting_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SystemSetting_key_key" ON public."SystemSetting" USING btree (key);


--
-- Name: AdminSession AdminSession_adminUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminSession"
    ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES public."AdminUser"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FreeTrialOption FreeTrialOption_networkServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FreeTrialOption"
    ADD CONSTRAINT "FreeTrialOption_networkServiceId_fkey" FOREIGN KEY ("networkServiceId") REFERENCES public."NetworkService"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NetworkService NetworkService_serviceTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NetworkService"
    ADD CONSTRAINT "NetworkService_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES public."ServiceType"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NetworkService NetworkService_socialNetworkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NetworkService"
    ADD CONSTRAINT "NetworkService_socialNetworkId_fkey" FOREIGN KEY ("socialNetworkId") REFERENCES public."SocialNetwork"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderAttempt OrderAttempt_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderAttempt"
    ADD CONSTRAINT "OrderAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderStatusHistory OrderStatusHistory_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderStatusHistory"
    ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_freeTrialOptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_freeTrialOptionId_fkey" FOREIGN KEY ("freeTrialOptionId") REFERENCES public."FreeTrialOption"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_networkServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_networkServiceId_fkey" FOREIGN KEY ("networkServiceId") REFERENCES public."NetworkService"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_serviceTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES public."ServiceType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_socialNetworkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_socialNetworkId_fkey" FOREIGN KEY ("socialNetworkId") REFERENCES public."SocialNetwork"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaidPackage PaidPackage_networkServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaidPackage"
    ADD CONSTRAINT "PaidPackage_networkServiceId_fkey" FOREIGN KEY ("networkServiceId") REFERENCES public."NetworkService"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RedirectEvent RedirectEvent_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RedirectEvent"
    ADD CONSTRAINT "RedirectEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RedirectEvent RedirectEvent_paidPackageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RedirectEvent"
    ADD CONSTRAINT "RedirectEvent_paidPackageId_fkey" FOREIGN KEY ("paidPackageId") REFERENCES public."PaidPackage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 9AQstWn9t60nj1gGNv9dpNGrFNgT5Pk7kG3YGF3mUfOpEeJb7IegII0kBCfHcY9

