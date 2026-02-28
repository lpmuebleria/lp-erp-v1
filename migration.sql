-- LP ERP Migration Script: SQLite to MySQL
SET FOREIGN_KEY_CHECKS = 0;

-- Table: products
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT  ,
  `codigo` VARCHAR(255) NOT NULL ,
  `modelo` TEXT NOT NULL ,
  `tamano` VARCHAR(255) NOT NULL ,
  `precio_lista` DECIMAL(15,2) NOT NULL ,
  `costo_total` DECIMAL(15,2) NOT NULL ,
  `activo` INT NOT NULL DEFAULT 1,
  `stock` INT NOT NULL DEFAULT 0,
  `maniobras` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `empaque` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `comision` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `garantias` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `utilidad_nivel` VARCHAR(255) NOT NULL DEFAULT 'media',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (1, 'LP0001', 'Comedor 4 sillas', 'Chico', 7544.171, 5341.67, 1, -1, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (2, 'LP0002', 'Sillon esquinero mediano', 'Mediano', 9095.4215, 5841.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (3, 'LP0003', 'sillon 3 piezas elegante', 'Grande', 15266.672, 9041.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (4, 'LP0004', 'Sillon equinero mediano', 'Mediano', 8950.4215, 5741.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (5, 'LP0005', 'Comedor 6 sillas', 'Grande', 11445.4215, 7341.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (6, 'LP0006', 'Sala 2 piezas', 'Grande', 13026.672, 7641.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (7, 'LP0007', 'Sala esquinera grande', 'Grande', 10306.672, 5941.67, 1, -1, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (8, 'LP0008', 'Sala elegante blanca', 'Grande', 14786.672, 8741.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (9, 'LP0009', 'Sala blanca grande', 'Grande', 9986.672, 5741.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (10, 'LP0010', 'Sala esquinera negra', 'Grande', 9986.672, 5741.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (11, 'LP0011', 'Sala elegante 3 pzas', 'Grande', 15266.672, 9041.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (12, 'LP0012', 'Sala esquinera', 'Mediano', 10690.4215, 6941.67, 1, -1, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (13, 'LP0013', 'Sala elegante blanca', 'Grande', 20546.672000000002, 12341.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (14, 'LP0014', 'Mesa de 4 patas 6 sillas', 'Grande', 12866.672, 7541.67, 1, -1, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (15, 'LP0015', 'Mesa base X 6 sillas', 'Grande', 13506.672, 7941.67, 1, 0, 0.0, 0.0, 0.0, 0.0, 'media');
INSERT INTO `products` (`id`, `codigo`, `modelo`, `tamano`, `precio_lista`, `costo_total`, `activo`, `stock`, `maniobras`, `empaque`, `comision`, `garantias`, `utilidad_nivel`) VALUES (16, 'LP0016', 'Mesa 8 sillas', 'Grande', 16226.672, 9641.67, 1, -1, 0.0, 0.0, 0.0, 0.0, 'media');

-- Table: cost_config
DROP TABLE IF EXISTS `cost_config`;
CREATE TABLE `cost_config` (
  `tamano` VARCHAR(255)  ,
  `maniobras` DECIMAL(15,2) NOT NULL ,
  `empaque` DECIMAL(15,2) NOT NULL ,
  `comision` DECIMAL(15,2) NOT NULL ,
  `garantias` DECIMAL(15,2) NOT NULL ,
  PRIMARY KEY (`tamano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `cost_config` (`tamano`, `maniobras`, `empaque`, `comision`, `garantias`) VALUES ('Chico', 200.0, 50.0, 200.0, 150.0);
INSERT INTO `cost_config` (`tamano`, `maniobras`, `empaque`, `comision`, `garantias`) VALUES ('Mediano', 225.0, 50.0, 200.0, 150.0);
INSERT INTO `cost_config` (`tamano`, `maniobras`, `empaque`, `comision`, `garantias`) VALUES ('Grande', 250.0, 50.0, 300.0, 200.0);

-- Table: settings
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `k` VARCHAR(255)  ,
  `v` TEXT NOT NULL ,
  PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `settings` (`k`, `v`) VALUES ('deposit_pct', '0.5');
INSERT INTO `settings` (`k`, `v`) VALUES ('fab_days_default', '25');
INSERT INTO `settings` (`k`, `v`) VALUES ('quote_valid_days', '30');
INSERT INTO `settings` (`k`, `v`) VALUES ('phone', '8718784462');
INSERT INTO `settings` (`k`, `v`) VALUES ('flete_unitario', '1200.0');

-- Table: customers
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT  ,
  `nombre` TEXT NOT NULL ,
  `telefono` TEXT  ,
  `direccion` TEXT  ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (1, 'Aurelio Lugo Santos', '4961216878', NULL);
INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (2, 'Alondra Lugo Santos', '8714008906', NULL);
INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (3, 'Alondra Lugo Santos', '8714008906', NULL);
INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (4, 'Alondra Lugo', '8714008906', NULL);
INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (5, 'Eduardo Peniche', '8714088234', NULL);
INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (6, 'Eduardo Peniche', '8714088234', NULL);
INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (7, 'Aldo Lugo', '999999999', NULL);
INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (8, 'Aldo Lugo', '999999999', NULL);
INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (9, 'eduardo javier', '8714088234', NULL);
INSERT INTO `customers` (`id`, `nombre`, `telefono`, `direccion`) VALUES (10, 'Jesus Alberto Garcia', '8718212972', NULL);

-- Table: quotes
DROP TABLE IF EXISTS `quotes`;
CREATE TABLE `quotes` (
  `id` INT AUTO_INCREMENT  ,
  `folio` VARCHAR(255) NOT NULL ,
  `created_at` TEXT NOT NULL ,
  `customer_id` INT  ,
  `vendedor` TEXT NOT NULL ,
  `descuento_global_tipo` TEXT  ,
  `descuento_global_val` DECIMAL(15,2)  ,
  `total` DECIMAL(15,2) NOT NULL ,
  `notas` TEXT  ,
  `status` VARCHAR(255) NOT NULL DEFAULT 'COTIZACION',
  `cliente_nombre` TEXT  ,
  `cliente_tel` TEXT  ,
  `cliente_email` TEXT  ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (1, 'COT-20260211-204050', '2026-02-11T20:40:50', NULL, 'Vendedor', NULL, NULL, 6789.753900000001, NULL, 'COTIZACION', NULL, NULL, NULL);
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (2, 'COT-20260211-204645', '2026-02-11T20:46:45', NULL, 'Vendedor', NULL, NULL, 34336.264500000005, NULL, 'COTIZACION', NULL, NULL, NULL);
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (3, 'COT-20260211-215140', '2026-02-11T21:51:40', NULL, 'Eduardo Peniche', NULL, NULL, 11445.4215, NULL, 'COTIZACION', NULL, NULL, NULL);
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (4, 'COT-20260215-203217', '2026-02-15T20:32:17', NULL, 'Vendedor', NULL, NULL, 7544.171, NULL, 'COTIZACION', NULL, NULL, NULL);
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (5, 'COT-20260215-203230', '2026-02-15T20:32:30', NULL, 'Eduardo Peniche', NULL, NULL, 7544.171, NULL, 'COTIZACION', NULL, NULL, NULL);
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (6, 'COT-20260217-202158', '2026-02-17T20:21:58', NULL, 'admin', NULL, NULL, 15266.672, NULL, 'PEDIDO', 'Alondra Lugo', '8714008906', 'alondralugosantos@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (7, 'COT-20260217-204112', '2026-02-17T20:41:12', NULL, 'admin', NULL, NULL, 15266.672, NULL, 'PEDIDO', 'Alondra Lugo', '8714008906', 'alondralugosantos@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (8, 'COT-20260217-204624', '2026-02-17T20:46:24', NULL, 'admin', NULL, NULL, 15266.672, NULL, 'PEDIDO', 'Alondra Lugo', '8714008906', 'alondralugosantos@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (9, 'COT-20260217-210909', '2026-02-17T21:09:09', NULL, 'Vendedor', NULL, NULL, 15266.672, NULL, 'PEDIDO', 'Alondra Lugo', '8714008906', 'alondralugosantos@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (10, 'COT-20260217-220933', '2026-02-17T22:09:33', 4, 'Vendedor', NULL, NULL, 8988.0048, NULL, 'PEDIDO', 'Alondra Lugo', '8714008906', 'alondralugosantos@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (11, 'COT-20260218-072510', '2026-02-18T07:25:10', 5, 'Vendedor', NULL, NULL, 9986.672, NULL, 'PEDIDO', 'Eduardo Peniche', '8714088234', 'eduardopeniche20@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (12, 'COT-20260218-072902', '2026-02-18T07:29:02', NULL, 'Vendedor', NULL, NULL, 13506.672, NULL, 'COTIZACION', 'Aurelio Lugo', '4961216878', '');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (13, 'COT-20260219-201801', '2026-02-19T20:18:01', 6, 'Vendedor', NULL, NULL, 42761.686, NULL, 'PEDIDO', 'Eduardo Peniche', '8714088234', 'eduardopeniche20@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (14, 'COT-20260219-202924', '2026-02-19T20:29:24', 7, 'Vendedor', NULL, NULL, 18312.6744, NULL, 'PEDIDO', 'Aldo Lugo', '999999999', '');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (15, 'COT-20260219-203646', '2026-02-19T20:36:46', 8, 'Vendedor', NULL, NULL, 59420.698399999994, NULL, 'PEDIDO', 'Aldo Lugo', '999999999', '');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (16, 'COT-20260221-105047', '2026-02-21T10:50:47', NULL, 'Vendedor', NULL, NULL, 15266.672, NULL, 'PEDIDO', 'Aurelio Lugo', '4961216878', '');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (17, 'VDQ-20260221-150824', '2026-02-21T15:08:24', NULL, 'vendedor', NULL, NULL, 20546.67, NULL, 'PEDIDO', 'Alma Díaz', '11111111', '');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (18, 'VDQ-20260221-152325', '2026-02-21T15:23:25', NULL, 'vendedor', NULL, NULL, 30533.34, NULL, 'PEDIDO', 'Alondra Lugo', '8714008906', 'alondralugosantos@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (19, 'APQ-20260222-080712', '2026-02-22T08:07:12', NULL, 'admin', NULL, NULL, 52562.94, NULL, 'PEDIDO', 'Eduardo Peniche', '8714088234', 'eduardopeniche20@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (20, 'APQ-20260222-081812', '2026-02-22T08:18:12', NULL, 'admin', NULL, NULL, 12866.67, NULL, 'PEDIDO', 'Soraida Garcia', '8717865220', 'soraidagarcia.cas@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (21, 'APQ-20260222-082453', '2026-02-22T08:24:53', NULL, 'admin', NULL, NULL, 7544.17, NULL, 'PEDIDO', 'Soraida Garcia', '8717865220', 'soraidagarcia.cas@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (22, 'APQ-20260222-084243', '2026-02-22T08:42:43', NULL, 'admin', NULL, NULL, 10306.67, NULL, 'PEDIDO', 'Aldo Lugo', '999999999', '');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (23, 'APQ-20260222-085122', '2026-02-22T08:51:22', NULL, 'admin', NULL, NULL, 10690.42, NULL, 'PEDIDO', 'Soraida Garcia', '8717865220', 'soraidagarcia.cas@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (24, 'COT-20260222-105240', '2026-02-22T10:52:40', 9, 'Vendedor', NULL, NULL, 16437.337600000003, NULL, 'PEDIDO', 'eduardo javier', '8714088234', 'eduardopeniche20@gmial.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (25, 'APQ-20260222-105909', '2026-02-22T10:59:09', NULL, 'admin', NULL, NULL, 16226.67, NULL, 'PEDIDO', 'eduardo javierf', '8714088234', 'eduardopeniche20@gmial.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (26, 'VDQ-20260222-180928', '2026-02-22T18:09:28', NULL, 'admin', NULL, NULL, 10690.42, NULL, 'PEDIDO', 'Jesus Alberto Garcia', '8718212972', 'xesusgmusic@gmail.com');
INSERT INTO `quotes` (`id`, `folio`, `created_at`, `customer_id`, `vendedor`, `descuento_global_tipo`, `descuento_global_val`, `total`, `notas`, `status`, `cliente_nombre`, `cliente_tel`, `cliente_email`) VALUES (27, 'COT-20260222-181353', '2026-02-22T18:13:53', 10, 'Vendedor', NULL, NULL, 10590.4215, NULL, 'PEDIDO', 'Jesus Alberto Garcia', '8718212972', 'xesusgmusic@gmail.com');

-- Table: quote_lines
DROP TABLE IF EXISTS `quote_lines`;
CREATE TABLE `quote_lines` (
  `id` INT AUTO_INCREMENT  ,
  `quote_id` INT NOT NULL ,
  `product_id` INT NOT NULL ,
  `cantidad` INT NOT NULL ,
  `precio_unit` DECIMAL(15,2) NOT NULL ,
  `descuento_tipo` TEXT  ,
  `descuento_val` DECIMAL(15,2)  ,
  `total_linea` DECIMAL(15,2) NOT NULL ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (1, 1, 1, 1, 7544.171, '%', 10.0, 6789.753900000001);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (2, 2, 5, 3, 11445.4215, NULL, NULL, 34336.264500000005);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (3, 3, 5, 1, 11445.4215, NULL, NULL, 11445.4215);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (4, 4, 1, 1, 7544.171, NULL, NULL, 7544.171);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (5, 5, 1, 1, 7544.171, NULL, NULL, 7544.171);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (6, 6, 3, 1, 15266.672, NULL, NULL, 15266.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (7, 7, 3, 1, 15266.672, NULL, NULL, 15266.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (8, 8, 3, 1, 15266.672, NULL, NULL, 15266.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (9, 9, 3, 1, 15266.672, NULL, NULL, 15266.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (10, 10, 9, 1, 9986.672, '%', 10.0, 8988.0048);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (11, 11, 10, 1, 9986.672, NULL, NULL, 9986.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (12, 12, 15, 1, 13506.672, NULL, NULL, 13506.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (13, 13, 12, 4, 10690.4215, NULL, NULL, 42761.686);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (14, 14, 5, 2, 11445.4215, '%', 20.0, 18312.6744);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (15, 15, 9, 7, 9986.672, '%', 15.0, 59420.698399999994);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (16, 16, 11, 1, 15266.672, NULL, NULL, 15266.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (17, 17, 13, 1, 20546.672000000002, NULL, NULL, 20546.672000000002);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (18, 18, 3, 2, 15266.672, NULL, NULL, 30533.344);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (19, 19, 1, 1, 7544.171, NULL, NULL, 7544.171);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (20, 19, 5, 1, 11445.4215, NULL, NULL, 11445.4215);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (21, 19, 6, 1, 13026.672, NULL, NULL, 13026.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (22, 19, 13, 1, 20546.672000000002, NULL, NULL, 20546.672000000002);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (23, 20, 14, 1, 12866.672, NULL, NULL, 12866.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (24, 21, 1, 1, 7544.171, NULL, NULL, 7544.171);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (25, 22, 7, 1, 10306.672, NULL, NULL, 10306.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (26, 23, 12, 1, 10690.4215, NULL, NULL, 10690.4215);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (27, 24, 13, 1, 20546.672000000002, '%', 20.0, 16437.337600000003);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (28, 25, 16, 1, 16226.672, NULL, NULL, 16226.672);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (29, 26, 12, 1, 10690.4215, NULL, NULL, 10690.4215);
INSERT INTO `quote_lines` (`id`, `quote_id`, `product_id`, `cantidad`, `precio_unit`, `descuento_tipo`, `descuento_val`, `total_linea`) VALUES (30, 27, 12, 1, 10690.4215, '$', 100.0, 10590.4215);

-- Table: orders
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT  ,
  `folio` VARCHAR(255) NOT NULL ,
  `created_at` TEXT NOT NULL ,
  `quote_id` INT  ,
  `customer_id` INT  ,
  `vendedor` TEXT NOT NULL ,
  `total` DECIMAL(15,2) NOT NULL ,
  `anticipo_req` DECIMAL(15,2) NOT NULL ,
  `anticipo_pagado` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `saldo` DECIMAL(15,2) NOT NULL ,
  `estatus` VARCHAR(255) NOT NULL DEFAULT 'Registrado',
  `entrega_estimada` TEXT NOT NULL ,
  `tipo` VARCHAR(255) NOT NULL DEFAULT 'VENTA_STOCK',
  `nota` VARCHAR(255) NOT NULL DEFAULT '',
  `estatus_solicitado` VARCHAR(255) NOT NULL DEFAULT '',
  `apartado_vence` VARCHAR(255) NOT NULL DEFAULT '',
  `apartado_prorroga_dias` INT NOT NULL DEFAULT 0,
  `apartado_liberado` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (1, 'PED-20260211-204308', '2026-02-11T20:43:08', 1, 1, 'Vendedor', 6789.753900000001, 3394.8769500000003, 6789.75, 0.0, 'LIQUIDADO', '2026-03-08', 'VENTA_STOCK', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (2, 'PED-20260211-204838', '2026-02-11T20:48:38', 2, 2, 'Vendedor', 34336.264500000005, 17168.132250000002, 34336.26, 0.00450000000273576, 'ENTREGADO', '2026-03-08', 'VENTA_STOCK', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (3, 'PED-20260211-215309', '2026-02-11T21:53:09', 3, 3, 'Eduardo Peniche', 11445.4215, 5722.71075, 6000.0, 5445.4215, 'Registrado', '2026-03-08', 'VENTA_STOCK', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (4, 'PED-20260217-212223', '2026-02-17T21:22:23', 9, NULL, 'Vendedor', 15266.672, 7633.336, 0.0, 15266.672, 'LIQUIDADO', '2026-03-14', 'VENTA_STOCK', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (5, 'PED-20260217-213442', '2026-02-17T21:34:42', 8, NULL, 'admin', 15266.672, 7633.336, 0.0, 15266.672, 'Registrado', '2026-03-14', 'VENTA_STOCK', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (6, 'PED-20260217-214259', '2026-02-17T21:42:59', 7, NULL, 'admin', 15266.672, 7633.336, 0.0, 15266.672, 'Registrado', '2026-03-14', 'VENTA_STOCK', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (7, 'PED-20260217-220553', '2026-02-17T22:05:53', 6, NULL, 'admin', 15266.672, 7633.336, 15266.67, 0.0, 'LIQUIDADO', '2026-03-14', 'VENTA_STOCK', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (8, 'PED-20260217-221027', '2026-02-17T22:10:27', 10, 4, 'Vendedor', 8988.0048, 4494.0024, 8988.0, 0.0, 'ENTREGADO', '2026-03-14', 'FABRICACION', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (9, 'PED-20260218-072622', '2026-02-18T07:26:22', 11, 5, 'Vendedor', 9986.672, 4993.336, 5000.0, 4986.6720000000005, 'EN FABRICACIÓN', '2026-03-15', 'FABRICACION', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (10, 'PED-20260219-201911', '2026-02-19T20:19:11', 13, 6, 'Vendedor', 42761.686, 21380.843, 25000.0, 17761.686, 'EN FABRICACIÓN', '2026-03-16', 'FABRICACION', '', 'CANCELADO', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (11, 'PED-20260219-203148', '2026-02-19T20:31:48', 14, 7, 'Vendedor', 18312.6744, 9156.3372, 9500.0, 8812.67, 'REGISTRADO', '2026-03-16', 'FABRICACION', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (12, 'PED-20260219-203708', '2026-02-19T20:37:08', 15, 8, 'Vendedor', 59420.698399999994, 29710.349199999997, 30000.0, 29420.698399999994, 'EN FABRICACIÓN', '2026-03-16', 'FABRICACION', 'CLIENTE QUIERE LA ENTREGA LO MÁS RAPIDO POSIBLE, PASAR A FABRICACIÓN URGENTE', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (13, 'PED-20260221-105225', '2026-02-21T10:52:25', 16, NULL, 'Vendedor', 15266.672, 7633.336, 8000.0, 7266.67, 'EN FABRICACIÓN', '2026-03-18', 'VENTA_STOCK', 'Quiere la sala color marron con sillas grises y un banco.', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (14, 'VD-20260221-150824', '2026-02-21T15:08:24', 17, NULL, 'vendedor', 20546.67, 10273.33, 20546.67, 0.0, 'LIQUIDADO', '', 'VENTA_STOCK', 'Entregar el fin de semana.', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (15, 'VD-20260221-152325', '2026-02-21T15:23:25', 18, NULL, 'vendedor', 30533.34, 15266.67, 30533.34, 0.0, 'PROGRAMADO', '2026-02-22 TARDE', 'VENTA_STOCK', 'Entrega urgente', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (16, 'AP-20260222-080712', '2026-02-22T08:07:12', 19, NULL, 'admin', 52562.94, 15768.88, 15000.0, 37562.94, 'APARTADO', '', 'APARTADO', 'Vence: 2026-03-24', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (17, 'AP-20260222-081812', '2026-02-22T08:18:12', 20, NULL, 'admin', 12866.67, 3860.0, 12866.67, 0.0, 'PROGRAMADO', '2026-02-22 TARDE', 'VENTA_STOCK', 'Liquida en 15 días | Vence: 2026-03-24', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (18, 'AP-20260222-082453', '2026-02-22T08:24:53', 21, NULL, 'admin', 7544.17, 2263.25, 2300.0, 5244.17, 'APARTADO', '', 'APARTADO', 'Vence: 2026-03-24', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (19, 'AP-20260222-084243', '2026-02-22T08:42:43', 22, NULL, 'admin', 10306.67, 3092.0, 3100.0, 7206.67, 'APARTADO', '', 'APARTADO', 'Vence: 2026-03-24', '', '2026-03-24', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (20, 'AP-20260222-085122', '2026-02-22T08:51:22', 23, NULL, 'admin', 10690.42, 3207.13, 3210.0, 7480.42, 'APARTADO', '', 'APARTADO', 'Vence: 2026-03-24', '', '2026-03-24', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (21, 'PED-20260222-105420', '2026-02-22T10:54:20', 24, 9, 'Vendedor', 16437.337600000003, 8218.668800000001, 20000.0, -3562.6623999999974, 'EN FABRICACIÓN', '2026-03-19', 'FABRICACION', '', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (22, 'AP-20260222-105909', '2026-02-22T10:59:09', 25, NULL, 'admin', 16226.67, 4868.0, 16226.67, 0.0, 'LIQUIDADO', '', 'VENTA_STOCK', 'el cliente aparta, en 15 dias liquida | Vence: 2026-03-24', '', '2026-03-24', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (23, 'VD-20260222-180928', '2026-02-22T18:09:28', 26, NULL, 'admin', 10690.42, 5345.21, 10690.42, 0.0, 'PROGRAMADO', '2026-02-28 MANANA', 'VENTA_STOCK', 'Sala color Beige còdigo 1002687', '', '', 0, 0);
INSERT INTO `orders` (`id`, `folio`, `created_at`, `quote_id`, `customer_id`, `vendedor`, `total`, `anticipo_req`, `anticipo_pagado`, `saldo`, `estatus`, `entrega_estimada`, `tipo`, `nota`, `estatus_solicitado`, `apartado_vence`, `apartado_prorroga_dias`, `apartado_liberado`) VALUES (24, 'PED-20260222-181608', '2026-02-22T18:16:08', 27, 10, 'Vendedor', 10590.4215, 5295.21075, 6000.0, 4590.4215, 'EN FABRICACIÓN', '2026-03-19', 'FABRICACION', '', '', '', 0, 0);

-- Table: payments
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT  ,
  `order_id` INT NOT NULL ,
  `created_at` TEXT NOT NULL ,
  `metodo` TEXT NOT NULL ,
  `monto` DECIMAL(15,2) NOT NULL ,
  `referencia` TEXT  ,
  `efectivo_recibido` DECIMAL(15,2)  ,
  `cambio` DECIMAL(15,2)  ,
  `anulado` INT NOT NULL DEFAULT 0,
  `motivo_anulacion` VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (1, 1, '2026-02-11T20:43:08', 'transferencia', 5000.0, '198765', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (2, 2, '2026-02-11T20:48:38', 'credito', 34336.26, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (3, 3, '2026-02-11T21:53:09', 'efectivo', 6000.0, '', 6000.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (4, 7, '2026-02-17T22:06:36', 'efectivo', 8000.0, '', 8000.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (5, 8, '2026-02-17T22:10:27', 'efectivo', 5000.0, '', 5000.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (6, 9, '2026-02-18T07:26:22', 'debito', 5000.0, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (7, 8, '2026-02-18T20:05:12', 'transferencia', 3000.0, '123456', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (8, 10, '2026-02-19T20:19:11', 'credito', 25000.0, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (9, 11, '2026-02-19T20:31:48', 'efectivo', 9500.0, '', 9500.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (10, 12, '2026-02-19T20:37:08', 'efectivo', 30000.0, '', 30000.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (11, 11, '2026-02-20T19:21:52', 'efectivo', 2000.0, '', 0.0, 0.0, 1, 'Anulado por admin');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (12, 8, '2026-02-21T10:46:08', 'efectivo', 988.0, '', 0.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (13, 13, '2026-02-21T10:54:37', 'efectivo', 8000.0, '', 0.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (14, 14, '2026-02-21T15:08:47', 'transferencia', 20546.67, '123456789', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (15, 15, '2026-02-21T15:23:38', 'debito', 30533.34, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (16, 16, '2026-02-22T08:07:44', 'debito', 15000.0, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (17, 17, '2026-02-22T08:18:45', 'debito', 4500.0, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (18, 18, '2026-02-22T08:25:12', 'transferencia', 2300.0, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (19, 17, '2026-02-22T08:31:40', 'efectivo', 8366.67, '', 0.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (20, 19, '2026-02-22T08:42:57', 'debito', 3100.0, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (21, 20, '2026-02-22T08:51:38', 'efectivo', 3210.0, '', 0.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (22, 21, '2026-02-22T10:54:20', 'efectivo', 20000.0, '', 0.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (23, 22, '2026-02-22T11:00:06', 'debito', 5000.0, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (24, 22, '2026-02-22T11:03:07', 'efectivo', 11226.67, '', 0.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (25, 23, '2026-02-22T18:10:34', 'debito', 5500.0, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (26, 24, '2026-02-22T18:16:08', 'debito', 6000.0, '', NULL, NULL, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (27, 1, '2026-02-22T18:19:08', 'efectivo', 1789.75, '', 0.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (28, 7, '2026-02-22T18:22:30', 'efectivo', 7266.67, '', 0.0, 0.0, 0, '');
INSERT INTO `payments` (`id`, `order_id`, `created_at`, `metodo`, `monto`, `referencia`, `efectivo_recibido`, `cambio`, `anulado`, `motivo_anulacion`) VALUES (29, 23, '2026-02-22T18:25:33', 'efectivo', 5190.42, '', 0.0, 0.0, 0, '');

-- Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `username` VARCHAR(255)  ,
  `pin` TEXT NOT NULL ,
  `rol` TEXT NOT NULL ,
  `password` TEXT  ,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`username`, `pin`, `rol`, `password`) VALUES ('admin', '1234', 'admin', 'admin123');
INSERT INTO `users` (`username`, `pin`, `rol`, `password`) VALUES ('vendedor', '1234', 'vendedor', NULL);

-- Table: utilidad_config
DROP TABLE IF EXISTS `utilidad_config`;
CREATE TABLE `utilidad_config` (
  `nivel` VARCHAR(255)  ,
  `multiplicador` DECIMAL(15,2) NOT NULL ,
  PRIMARY KEY (`nivel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `utilidad_config` (`nivel`, `multiplicador`) VALUES ('baja', 1.3);
INSERT INTO `utilidad_config` (`nivel`, `multiplicador`) VALUES ('media', 1.45);
INSERT INTO `utilidad_config` (`nivel`, `multiplicador`) VALUES ('alta', 1.6);

-- Table: deliveries
DROP TABLE IF EXISTS `deliveries`;
CREATE TABLE `deliveries` (
  `id` INT AUTO_INCREMENT  ,
  `order_id` INT NOT NULL ,
  `fecha` TEXT NOT NULL ,
  `turno` TEXT NOT NULL ,
  `created_at` TEXT NOT NULL ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `deliveries` (`id`, `order_id`, `fecha`, `turno`, `created_at`) VALUES (1, 15, '2026-02-22', 'TARDE', '2026-02-21T20:26:19');
INSERT INTO `deliveries` (`id`, `order_id`, `fecha`, `turno`, `created_at`) VALUES (2, 17, '2026-02-22', 'TARDE', '2026-02-22T08:32:04');
INSERT INTO `deliveries` (`id`, `order_id`, `fecha`, `turno`, `created_at`) VALUES (3, 23, '2026-02-28', 'MANANA', '2026-02-22T18:26:22');

SET FOREIGN_KEY_CHECKS = 1;
