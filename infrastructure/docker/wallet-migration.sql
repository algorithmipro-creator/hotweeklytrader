ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_network_source_address_key" UNIQUE (network, source_address);
ALTER TABLE "Wallet" ALTER COLUMN "source_address" SET NOT NULL;
