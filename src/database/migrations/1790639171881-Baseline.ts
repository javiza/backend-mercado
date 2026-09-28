import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1790639171881 implements MigrationInterface {
    name = 'Baseline1790639171881'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Si la base ya se creó antes con `synchronize` (sin historial de migraciones), NO se recrean las
        // tablas: esta migración solo queda registrada como aplicada y se continúa con las siguientes.
        const existente = await queryRunner.query(`SELECT to_regclass('public.usuarios') AS t`);
        if (existente[0]?.t) return;

        await queryRunner.query(`CREATE TABLE "categorias" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "descripcion" text, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ccdf6cd1a34ea90a7233325063d" UNIQUE ("nombre"), CONSTRAINT "PK_3886a26251605c571c6b4f861fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "productos" ("id" SERIAL NOT NULL, "nombre" character varying(150) NOT NULL, "descripcion" text, "sku" character varying(50), "codigo_barra" character varying(50), "precio_venta" numeric(10,2) NOT NULL, "precio_costo" numeric(10,2) NOT NULL, "stock_actual" integer NOT NULL DEFAULT '0', "stock_minimo" integer NOT NULL DEFAULT '0', "unidad_medida" character varying(20) NOT NULL DEFAULT 'UNIDAD', "imagen_url" text, "visible_tienda" boolean NOT NULL DEFAULT true, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), "categoria_id" integer, CONSTRAINT "UQ_805687bf24c1411756fbd37b2f3" UNIQUE ("sku"), CONSTRAINT "PK_04f604609a0949a7f3b43400766" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ventas_detalle" ("id" SERIAL NOT NULL, "cantidad" integer NOT NULL, "precio_unitario" numeric(10,2) NOT NULL, "subtotal" numeric(12,2) NOT NULL, "venta_id" integer, "producto_id" integer, CONSTRAINT "PK_437135139a60fabf6240a6d37ee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "clientes" ("id" SERIAL NOT NULL, "nombre" character varying(150) NOT NULL, "email" character varying(150) NOT NULL, "password" character varying NOT NULL, "telefono" character varying(50), "rut" character varying(20), "telefonos_adicionales" text array NOT NULL DEFAULT '{}', "correos_adicionales" text array NOT NULL DEFAULT '{}', "activo" boolean NOT NULL DEFAULT true, "hashed_refresh_token" character varying, "reset_password_token" character varying, "reset_password_expires" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3cd5652ab34ca1a0a2c7a255313" UNIQUE ("email"), CONSTRAINT "PK_d76bf3571d906e4e86470482c08" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."ventas_canal_enum" AS ENUM('ONLINE', 'MOSTRADOR')`);
        await queryRunner.query(`CREATE TYPE "public"."ventas_estado_enum" AS ENUM('PENDIENTE_PAGO', 'PAGADA', 'ENTREGADA', 'ANULADA')`);
        await queryRunner.query(`CREATE TABLE "ventas" ("id" SERIAL NOT NULL, "canal" "public"."ventas_canal_enum" NOT NULL, "estado" "public"."ventas_estado_enum" NOT NULL DEFAULT 'PENDIENTE_PAGO', "usuario_id" integer, "subtotal" numeric(12,2) NOT NULL, "total" numeric(12,2) NOT NULL, "direccion_entrega" text, "notas" text, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), "cliente_id" integer, CONSTRAINT "PK_b8b73abe8561829c019531d9a2e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."usuarios_rol_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'CAJERO', 'BODEGA')`);
        await queryRunner.query(`CREATE TABLE "usuarios" ("id" SERIAL NOT NULL, "nombre" character varying(150) NOT NULL, "email" character varying(150) NOT NULL, "password" character varying NOT NULL, "rol" "public"."usuarios_rol_enum" NOT NULL DEFAULT 'ADMIN', "rut" character varying(20), "activo" boolean NOT NULL DEFAULT true, "hashed_refresh_token" character varying, "reset_password_token" character varying, "reset_password_expires" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email"), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "proveedores_mercaderia" ("id" SERIAL NOT NULL, "nombre" character varying(150) NOT NULL, "rut" character varying(20), "contacto" character varying(150), "telefono" character varying(50), "email" character varying(150), "direccion" text, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7daca361182a3a5e0fdbc5d0d1e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "empleados" ("id" SERIAL NOT NULL, "cargo" character varying(100) NOT NULL, "sueldo_base" numeric(12,2) NOT NULL, "fecha_contratacion" date NOT NULL, "telefono" character varying(50), "direccion" text, "contacto_emergencia_nombre" character varying(150), "contacto_emergencia_telefono" character varying(50), "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "usuario_id" integer, CONSTRAINT "REL_8a9bfbf5f1b55c0ca3a16abd3f" UNIQUE ("usuario_id"), CONSTRAINT "PK_73a63a6fcb4266219be3eb0ce8a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "turnos" ("id" SERIAL NOT NULL, "fecha" date NOT NULL, "hora_inicio" TIME NOT NULL, "hora_fin" TIME NOT NULL, "notas" text, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "empleado_id" integer, CONSTRAINT "PK_61dbaea0fc136ee2ef981f14782" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."cajas_estado_enum" AS ENUM('ABIERTA', 'CERRADA')`);
        await queryRunner.query(`CREATE TABLE "cajas" ("id" SERIAL NOT NULL, "usuario_id" integer NOT NULL, "estado" "public"."cajas_estado_enum" NOT NULL DEFAULT 'ABIERTA', "monto_apertura" numeric(12,2) NOT NULL, "monto_cierre_declarado" numeric(12,2), "monto_esperado" numeric(12,2), "diferencia" numeric(12,2), "observaciones" text, "abierta_en" TIMESTAMP NOT NULL DEFAULT now(), "cerrada_en" TIMESTAMP, CONSTRAINT "PK_92b27e5f4ab36a544f37bf45e09" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."pagos_medio_enum" AS ENUM('EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'WEBPAY')`);
        await queryRunner.query(`CREATE TYPE "public"."pagos_estado_enum" AS ENUM('CONFIRMADO', 'RECHAZADO', 'REEMBOLSADO')`);
        await queryRunner.query(`CREATE TABLE "pagos" ("id" SERIAL NOT NULL, "medio" "public"."pagos_medio_enum" NOT NULL, "estado" "public"."pagos_estado_enum" NOT NULL DEFAULT 'CONFIRMADO', "monto" numeric(12,2) NOT NULL, "referencia" character varying(150), "usuario_id" integer, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "venta_id" integer, "caja_id" integer, CONSTRAINT "PK_37321ca70a2ed50885dc205beb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."movimientos_stock_tipo_enum" AS ENUM('INGRESO', 'VENTA', 'AJUSTE', 'MERMA', 'ANULACION_VENTA')`);
        await queryRunner.query(`CREATE TABLE "movimientos_stock" ("id" SERIAL NOT NULL, "tipo" "public"."movimientos_stock_tipo_enum" NOT NULL, "cantidad" integer NOT NULL, "stock_resultante" integer NOT NULL, "referencia" character varying(100), "usuario_id" integer, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "producto_id" integer, CONSTRAINT "PK_11359dd02b7e2b4f69b30e5ee2d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ingresos_mercaderia_detalle" ("id" SERIAL NOT NULL, "cantidad" integer NOT NULL, "costo_unitario" numeric(10,2) NOT NULL, "subtotal" numeric(12,2) NOT NULL, "ingreso_id" integer, "producto_id" integer, CONSTRAINT "PK_8716e843bda6d6da7c56b0ea9ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ingresos_mercaderia" ("id" SERIAL NOT NULL, "numero_documento" character varying(50), "observacion" text, "total" numeric(12,2) NOT NULL DEFAULT '0', "usuario_id" integer NOT NULL, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "proveedor_id" integer, CONSTRAINT "PK_2264baa22d92f56ebbc2c034b00" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "productos" ADD CONSTRAINT "FK_5aaee6054b643e7c778477193a3" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ventas_detalle" ADD CONSTRAINT "FK_8924247d4f94f4790cb8d23cc0e" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ventas_detalle" ADD CONSTRAINT "FK_9efe34643fda7be7efda2543f0e" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ventas" ADD CONSTRAINT "FK_6a9b8170c731e6ca2449ea27c52" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "empleados" ADD CONSTRAINT "FK_8a9bfbf5f1b55c0ca3a16abd3f0" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "turnos" ADD CONSTRAINT "FK_dd22eeb7839256e6a22825c185e" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pagos" ADD CONSTRAINT "FK_4c86df5e03d591485cb8fd20e96" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pagos" ADD CONSTRAINT "FK_046cf82bc8c8e638534dec6f52c" FOREIGN KEY ("caja_id") REFERENCES "cajas"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimientos_stock" ADD CONSTRAINT "FK_af7ee6d27a6567d20176abc4bf7" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ingresos_mercaderia_detalle" ADD CONSTRAINT "FK_3280f61f62d11751ff073b5e3d1" FOREIGN KEY ("ingreso_id") REFERENCES "ingresos_mercaderia"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ingresos_mercaderia_detalle" ADD CONSTRAINT "FK_b85050c2824de512d7fec88647b" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ingresos_mercaderia" ADD CONSTRAINT "FK_1d52ae4e45c6cc7bb3b7e7b5f67" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores_mercaderia"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ingresos_mercaderia" DROP CONSTRAINT "FK_1d52ae4e45c6cc7bb3b7e7b5f67"`);
        await queryRunner.query(`ALTER TABLE "ingresos_mercaderia_detalle" DROP CONSTRAINT "FK_b85050c2824de512d7fec88647b"`);
        await queryRunner.query(`ALTER TABLE "ingresos_mercaderia_detalle" DROP CONSTRAINT "FK_3280f61f62d11751ff073b5e3d1"`);
        await queryRunner.query(`ALTER TABLE "movimientos_stock" DROP CONSTRAINT "FK_af7ee6d27a6567d20176abc4bf7"`);
        await queryRunner.query(`ALTER TABLE "pagos" DROP CONSTRAINT "FK_046cf82bc8c8e638534dec6f52c"`);
        await queryRunner.query(`ALTER TABLE "pagos" DROP CONSTRAINT "FK_4c86df5e03d591485cb8fd20e96"`);
        await queryRunner.query(`ALTER TABLE "turnos" DROP CONSTRAINT "FK_dd22eeb7839256e6a22825c185e"`);
        await queryRunner.query(`ALTER TABLE "empleados" DROP CONSTRAINT "FK_8a9bfbf5f1b55c0ca3a16abd3f0"`);
        await queryRunner.query(`ALTER TABLE "ventas" DROP CONSTRAINT "FK_6a9b8170c731e6ca2449ea27c52"`);
        await queryRunner.query(`ALTER TABLE "ventas_detalle" DROP CONSTRAINT "FK_9efe34643fda7be7efda2543f0e"`);
        await queryRunner.query(`ALTER TABLE "ventas_detalle" DROP CONSTRAINT "FK_8924247d4f94f4790cb8d23cc0e"`);
        await queryRunner.query(`ALTER TABLE "productos" DROP CONSTRAINT "FK_5aaee6054b643e7c778477193a3"`);
        await queryRunner.query(`DROP TABLE "ingresos_mercaderia"`);
        await queryRunner.query(`DROP TABLE "ingresos_mercaderia_detalle"`);
        await queryRunner.query(`DROP TABLE "movimientos_stock"`);
        await queryRunner.query(`DROP TYPE "public"."movimientos_stock_tipo_enum"`);
        await queryRunner.query(`DROP TABLE "pagos"`);
        await queryRunner.query(`DROP TYPE "public"."pagos_estado_enum"`);
        await queryRunner.query(`DROP TYPE "public"."pagos_medio_enum"`);
        await queryRunner.query(`DROP TABLE "cajas"`);
        await queryRunner.query(`DROP TYPE "public"."cajas_estado_enum"`);
        await queryRunner.query(`DROP TABLE "turnos"`);
        await queryRunner.query(`DROP TABLE "empleados"`);
        await queryRunner.query(`DROP TABLE "proveedores_mercaderia"`);
        await queryRunner.query(`DROP TABLE "usuarios"`);
        await queryRunner.query(`DROP TYPE "public"."usuarios_rol_enum"`);
        await queryRunner.query(`DROP TABLE "ventas"`);
        await queryRunner.query(`DROP TYPE "public"."ventas_estado_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ventas_canal_enum"`);
        await queryRunner.query(`DROP TABLE "clientes"`);
        await queryRunner.query(`DROP TABLE "ventas_detalle"`);
        await queryRunner.query(`DROP TABLE "productos"`);
        await queryRunner.query(`DROP TABLE "categorias"`);
    }

}
