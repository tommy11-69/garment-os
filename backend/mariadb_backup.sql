-- Hostinger MariaDB Garment OS Complete Dump & Schema
-- Generated for MariaDB 10.5+ / MySQL 8.0+
-- Preserves 100% of live Cloudflare D1 data

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE customers (
    `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(191) UNIQUE NOT NULL,
    name LONGTEXT NOT NULL,
    company LONGTEXT DEFAULT '',
    initials LONGTEXT DEFAULT '',
    avatar LONGTEXT DEFAULT '',
    email LONGTEXT DEFAULT '',
    phone LONGTEXT DEFAULT '',
    status LONGTEXT DEFAULT 'Active',
    statusColor LONGTEXT DEFAULT 'bg-[#008A00]/10 text-[#008A00]',
    contactPerson LONGTEXT DEFAULT '',
    whatsapp LONGTEXT DEFAULT '',
    gst LONGTEXT DEFAULT '',
    customerType LONGTEXT DEFAULT 'Brand',
    paymentTerms LONGTEXT DEFAULT '',
    creditLimit DOUBLE DEFAULT 0,
    currency LONGTEXT DEFAULT 'INR',
    address LONGTEXT DEFAULT '',
    city LONGTEXT DEFAULT '',
    state LONGTEXT DEFAULT '',
    country LONGTEXT DEFAULT '',
    pincode LONGTEXT DEFAULT '',
    notes LONGTEXT DEFAULT '',
    isActive INT DEFAULT 1,
    customerCode LONGTEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(3,'c-1787099120799','Sai Sharvesh','Zablox Technologies','SA','','','9566614027','Active','bg-success-container/30 text-success','','','','Select Type','',0,'INR','','Erode','Tamilnadu','India','638004','',1,'CUST-1824','2026-08-19T00:25:22.617Z','2026-08-19T01:26:50.085Z');
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(4,'c-1787103935174','Vijay','','VI','','','696969696969','Active','bg-[#008A00]/10 text-[#008A00]','','','','Brand','',0,'INR','','','','','','',1,'CUST-7203','2026-08-19T01:45:35.530Z','2026-08-19T01:45:35.530Z');
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(5,'c-1787104905699','Abishek ','Shalini cottons ','','','','','Active','bg-success-container/30 text-success','Abishek ','+91 94875 35673','','Select Type','','','INR','','','','India','','',1,'','2026-08-19T02:01:45.699Z','2026-08-19T02:01:45.699Z');
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(6,'c-1787142054492','Sai','Zablox','','','','','Active','bg-success-container/30 text-success','','','','Select Type','','','INR','','','','India','','',1,'','2026-08-19T12:20:54.492Z','2026-08-19T12:20:54.492Z');
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(7,'c-1787142155727','Milton school ','Rayyan educational trust ','','','','','Active','bg-success-container/30 text-success','Accounts team ','7339318666','','Brand','','','INR','','Chennai ','Tamilnadu ','India','','',1,'','2026-08-19T12:22:35.727Z','2026-08-19T12:22:35.727Z');
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(8,'c-1787513437918','Trippin','Railsphere ','','','','','Active','bg-success-container/30 text-success','Suryajegan','+91 96267 54705','','Wholesaler','','','INR','','Karur','','India','','',1,'','2026-08-23T19:30:37.918Z','2026-08-23T19:30:37.918Z');
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(9,'c-1787563663708','Nagarajan','SSOM','NA','','','9842756455','Active','bg-[#008A00]/10 text-[#008A00]','','','','Manufacturer','',0,'INR','','','','','','',1,'CUST-7177','2026-08-24T09:27:44.528Z','2026-08-24T09:27:44.528Z');
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(10,'c-001','Priya Rajan','Chennai Silks','PR','https://lh3.googleusercontent.com/aida-public/AB6AXuDjsQrnDGH6EpdDe4Jzpub5fpI9paxS1qSAF-0EYDdMRn-40Zfp1H4ivFc2T7cTj7HS3uZnWtjlCmyhcGKN0KHS3HNaNzMWa9yB-DqA66rQK9arPwIXmP6fDsjao2TRWu0oBpTuJXOMi1KOYpAZUIu7lItqa1jt8lggfNjZcOdLiLUjAY1Pzb1YSCbv0Mv1uuofmOTAuRcPT0in4vDp1x6znmYUJiKEFUrz6dxdh7LMj1KSq02cN5HiRB1n2brh4gxTAT1U9qJlUa8Q','priya@chennaisilks.com','+1 (555) 019-2834','Active','bg-[#008A00]/10 text-[#008A00]','','','','Brand','',0,'INR','','','','','','',1,'','2026-08-24 09:51:40','2026-08-24 09:51:40');
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(12,'c-1787963243350','Ashwath','','AS','','','8807634134','Active','bg-[#008A00]/10 text-[#008A00]','','','','Brand','',0,'INR','','','','','','',1,'CUST-4060','2026-08-29T00:27:24.144Z','2026-08-29T00:27:24.144Z');
INSERT INTO `customers` (`_rowid`,`id`,`name`,`company`,`initials`,`avatar`,`email`,`phone`,`status`,`statusColor`,`contactPerson`,`whatsapp`,`gst`,`customerType`,`paymentTerms`,`creditLimit`,`currency`,`address`,`city`,`state`,`country`,`pincode`,`notes`,`isActive`,`customerCode`,`createdAt`,`updatedAt`) VALUES(13,'c-1788287461142','Rohini','Aagam','RO','','','+91 96885 70020','Active','bg-[#008A00]/10 text-[#008A00]','','','','Brand','',0,'INR','','','','','','',1,'CUST-8953','2026-09-01T18:31:02.208Z','2026-09-01T18:31:02.208Z');
CREATE TABLE orders (
    `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(191) UNIQUE NOT NULL,
    customerName LONGTEXT DEFAULT '',
    customerId LONGTEXT DEFAULT '',
    costingId LONGTEXT DEFAULT '',
    product LONGTEXT DEFAULT '',
    sizes LONGTEXT DEFAULT '[]',
    colours LONGTEXT DEFAULT '[]',
    qty INT DEFAULT 0,
    unitPrice DOUBLE DEFAULT 0,
    subtotal DOUBLE DEFAULT 0,
    discount DOUBLE DEFAULT 0,
    tax DOUBLE DEFAULT 0,
    shipping DOUBLE DEFAULT 0,
    grandTotal DOUBLE DEFAULT 0,
    value DOUBLE DEFAULT 0,
    incurredCost DOUBLE DEFAULT 0,
    quotedCost DOUBLE DEFAULT 0,
    status LONGTEXT DEFAULT 'Draft',
    statusColor LONGTEXT DEFAULT 'bg-surface-variant text-secondary',
    dateMonth LONGTEXT DEFAULT '',
    dateDay LONGTEXT DEFAULT '',
    deliveryDate LONGTEXT DEFAULT '',
    priority LONGTEXT DEFAULT 'Normal',
    factory LONGTEXT DEFAULT '',
    productionManager LONGTEXT DEFAULT '',
    merchandiser LONGTEXT DEFAULT '',
    progressPercentage DOUBLE DEFAULT 0,
    progressLabel LONGTEXT DEFAULT '',
    progressColor LONGTEXT DEFAULT '',
    notes LONGTEXT DEFAULT '',
    timeline LONGTEXT DEFAULT '[]',
    tasks LONGTEXT DEFAULT '[]',
    expenses LONGTEXT DEFAULT '[]',
    paymentStatus LONGTEXT DEFAULT '',
    paymentReceived DOUBLE DEFAULT 0,
    fabric LONGTEXT DEFAULT '',
    activityLog LONGTEXT DEFAULT '[]',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
, products LONGTEXT DEFAULT '[]');
INSERT INTO `orders` (`_rowid`,`id`,`customerName`,`customerId`,`costingId`,`product`,`sizes`,`colours`,`qty`,`unitPrice`,`subtotal`,`discount`,`tax`,`shipping`,`grandTotal`,`value`,`incurredCost`,`quotedCost`,`status`,`statusColor`,`dateMonth`,`dateDay`,`deliveryDate`,`priority`,`factory`,`productionManager`,`merchandiser`,`progressPercentage`,`progressLabel`,`progressColor`,`notes`,`timeline`,`tasks`,`expenses`,`paymentStatus`,`paymentReceived`,`fabric`,`activityLog`,`createdAt`,`updatedAt`,`products`) VALUES(6,'o-1787386417302','Milton school','c-1787142155727','','Polyester tshirt','[]','[]',133,0,0,0,0,0,0,0,0,0,'Dispatched','bg-surface-variant text-secondary','','','2026-08-24','Normal','','','',100,'Completed','bg-[#008A00]','','[{`id`:"t-1787691950358",`date`:"26 Aug 2026, 02:35 am",`title`:"Status: Dispatched",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787509190407",`date`:"23 Aug 2026, 11:49 pm",`title`:"Status: Ironing & Packing",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787509182481",`date`:"23 Aug 2026, 11:49 pm",`title`:"Status: Stitching",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787386489062",`date`:"22 Aug 2026, 01:44 pm",`title`:"Status: Ironing & Packing",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787386488217",`date`:"22 Aug 2026, 01:44 pm",`title`:"Status: Ironing & Packing",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787386485246",`date`:"22 Aug 2026, 01:44 pm",`title`:"Status: Ironing & Packing",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787386466717",`date`:"22 Aug 2026, 01:44 pm",`title`:"Status: Stitching",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787386465024",`date`:"22 Aug 2026, 01:44 pm",`title`:"Status: Stitching",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787386464247",`date`:"22 Aug 2026, 01:44 pm",`title`:"Status: Stitching",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787386434497",`date`:"22 Aug 2026, 01:43 pm",`title`:"Status: Cutting",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787386433339",`date`:"22 Aug 2026, 01:43 pm",`title`:"Status: Cutting",`user`:"System Workflow",`type`:`status`}]','[{`id`:"tsk-1787509191422",`title`:"Pack and label boxes",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787509190990",`title`:"Iron all pieces",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:"",`completed`:false},{`id`:"tsk-1787509183321",`title`:"Attach collar and sleeves",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:"",`completed`:false},{`id`:"tsk-1787509182917",`title`:"Assemble front & back panels",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787509182483-0.4304536615411175",`title`:"First Piece Approval (FPA)",`status`:`Pending`,`assignee`:"QC Team",`completed`:false},{`id`:"tsk-1787386489650",`title`:"Pack and label boxes",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:"",`completed`:false},{`id`:"tsk-1787386489342",`title`:"Iron all pieces",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:"",`completed`:false},{`id`:"tsk-1787386488774",`title`:"Pack and label boxes",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787386488477",`title`:"Iron all pieces",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787386485836",`title`:"Pack and label boxes",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787386485535",`title`:"Iron all pieces",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787386467338",`title`:"Attach collar and sleeves",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787386467019",`title`:"Assemble front & back panels",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787386466718-0.9438613398125145",`title`:"First Piece Approval (FPA)",`status`:`Pending`,`assignee`:"QC Team"},{`id`:"tsk-1787386465295",`title`:"Assemble front & back panels",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787386465024-0.08849109789096277",`title`:"First Piece Approval (FPA)",`status`:`Pending`,`assignee`:"QC Team"},{`id`:"tsk-1787386464786",`title`:"Attach collar and sleeves",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787386464515",`title`:"Assemble front & back panels",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787386464248-0.7550720654139587",`title`:"First Piece Approval (FPA)",`status`:`Pending`,`assignee`:"QC Team"},{`id`:"tsk-1787386435051",`title`:"Apply marker templates & cut fabrics",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:"",`completed`:false},{`id`:"tsk-1787386434758",`title`:"Verify fabric quantity & laying",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:"",`completed`:false},{`id`:"tsk-1787386434498-0.957345214881911",`title`:"Approve Cut Plan",`status`:`Pending`,`assignee`:"Floor Spv",`completed`:false},{`id`:"tsk-1787386433934",`title`:"Apply marker templates & cut fabrics",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:"",`completed`:false},{`id`:"tsk-1787386433639",`title`:"Verify fabric quantity & laying",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:"",`completed`:false},{`id`:"tsk-1787386433344-0.6538401711627798",`title`:"Approve Cut Plan",`status`:`Pending`,`assignee`:"Floor Spv",`completed`:false}]','[]','Unpaid',0,'','[]','2026-08-22T08:13:37.302Z','2026-08-25T21:05:50.928Z','[]');
INSERT INTO `orders` (`_rowid`,`id`,`customerName`,`customerId`,`costingId`,`product`,`sizes`,`colours`,`qty`,`unitPrice`,`subtotal`,`discount`,`tax`,`shipping`,`grandTotal`,`value`,`incurredCost`,`quotedCost`,`status`,`statusColor`,`dateMonth`,`dateDay`,`deliveryDate`,`priority`,`factory`,`productionManager`,`merchandiser`,`progressPercentage`,`progressLabel`,`progressColor`,`notes`,`timeline`,`tasks`,`expenses`,`paymentStatus`,`paymentReceived`,`fabric`,`activityLog`,`createdAt`,`updatedAt`,`products`) VALUES(7,'o-1787513846925','Trippin','c-1787513437918','','Cotton Tshirt','[]','[]',13,0,0,0,0,0,0,0,0,0,'Dispatched','bg-surface-variant text-secondary','','','2026-08-24','Normal','','','',100,'Completed','bg-[#008A00]','','[{`id`:"t-1787691939883",`date`:"26 Aug 2026, 02:35 am",`title`:"Status: Dispatched",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787513871968",`date`:"24 Aug 2026, 01:07 am",`title`:"Status: Ironing & Packing",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787513863129",`date`:"24 Aug 2026, 01:07 am",`title`:"Status: Printing/Embroidery",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787513859621",`date`:"24 Aug 2026, 01:07 am",`title`:"Status: Stitching",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787513856875",`date`:"24 Aug 2026, 01:07 am",`title`:"Status: Stitching",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787513855120",`date`:"24 Aug 2026, 01:07 am",`title`:"Status: Stitching",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787513854400",`date`:"24 Aug 2026, 01:07 am",`title`:"Status: Cutting",`user`:"System Workflow",`type`:`status`},{`id`:"t-1787513853811",`date`:"24 Aug 2026, 01:07 am",`title`:"Status: Cutting",`user`:"System Workflow",`type`:`status`}]','[{`id`:"tsk-1787513872647",`title`:"Pack and label boxes",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513872295",`title`:"Iron all pieces",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513863821",`title`:"Print sample panel & check alignment",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513863492",`title`:"Prepare screen/embroidery frames",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513860284",`title`:"Attach collar and sleeves",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513859954",`title`:"Assemble front & back panels",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513859622-0.9030948315172319",`title`:"First Piece Approval (FPA)",`status`:`Pending`,`assignee`:"QC Team"},{`id`:"tsk-1787513857533",`title`:"Attach collar and sleeves",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513857201",`title`:"Assemble front & back panels",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513856876-0.9105235565474181",`title`:"First Piece Approval (FPA)",`status`:`Pending`,`assignee`:"QC Team"},{`id`:"tsk-1787513855966",`title`:"Attach collar and sleeves",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513855656",`title`:"Assemble front & back panels",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513855120-0.21307286139023573",`title`:"First Piece Approval (FPA)",`status`:`Pending`,`assignee`:"QC Team"},{`id`:"tsk-1787513854496",`title`:"Apply marker templates & cut fabrics",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513854133",`title`:"Verify fabric quantity & laying",`status`:`Pending`,`assignee`:`Unassigned`,`priority`:`Normal`,`dueDate`:"",`notes`:""},{`id`:"tsk-1787513853812-0.06458560558732351",`title`:"Approve Cut Plan",`status`:`Pending`,`assignee`:"Floor Spv"}]','[]','Paid',5000,'','[]','2026-08-23T19:37:26.925Z','2026-08-25T21:05:40.206Z','[]');
CREATE TABLE inventory (
    `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(191) UNIQUE NOT NULL,
    name LONGTEXT DEFAULT '',
    sku LONGTEXT DEFAULT '',
    quantity DOUBLE DEFAULT 0,
    unit LONGTEXT DEFAULT '',
    status LONGTEXT DEFAULT 'In Stock',
    statusColor LONGTEXT DEFAULT 'bg-[#008A00]/10 text-[#008A00]',
    icon LONGTEXT DEFAULT 'inventory_2',
    iconColor LONGTEXT DEFAULT 'bg-primary/10 text-primary',
    historicalAvgConsumption DOUBLE DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO `inventory` (`_rowid`,`id`,`name`,`sku`,`quantity`,`unit`,`status`,`statusColor`,`icon`,`iconColor`,`historicalAvgConsumption`,`createdAt`,`updatedAt`) VALUES(1,'inv-001','Organic Cotton Jersey','FAB-OC-001',4500,'Meters','In Stock','bg-[#008A00]/10 text-[#008A00]','inventory_2','bg-primary/10 text-primary',1.25,'2026-08-19 00:21:30','2026-08-19 00:21:30');
INSERT INTO `inventory` (`_rowid`,`id`,`name`,`sku`,`quantity`,`unit`,`status`,`statusColor`,`icon`,`iconColor`,`historicalAvgConsumption`,`createdAt`,`updatedAt`) VALUES(2,'inv-002','Navy Blue Thread','THR-NB-024',12,'Cones','Low Stock','bg-error/10 text-error','linear_scale','bg-[#5E5CE6]/10 text-[#5E5CE6]',0.05,'2026-08-19 00:21:30','2026-08-19 00:21:30');
CREATE TABLE batches (
    `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(191) UNIQUE NOT NULL,
    orderId LONGTEXT DEFAULT '',
    description LONGTEXT DEFAULT '',
    phase LONGTEXT DEFAULT '',
    progress DOUBLE DEFAULT 0,
    progressColor LONGTEXT DEFAULT '',
    expenses LONGTEXT DEFAULT '[]',
    consumptions LONGTEXT DEFAULT '[]',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO `batches` (`_rowid`,`id`,`orderId`,`description`,`phase`,`progress`,`progressColor`,`expenses`,`consumptions`,`createdAt`,`updatedAt`) VALUES(1,'B-8092','ORD-992','Organic Tees • 5k units','Cutting',45,'bg-primary','["txn-004"]','[{`invId`:"inv-001",`actualConsumption`:150,`date`:"2026-10-15"}]','2026-08-19 00:21:30','2026-08-19 00:21:30');
CREATE TABLE transactions (
    `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(191) UNIQUE NOT NULL,
    type LONGTEXT DEFAULT '',
    amount DOUBLE DEFAULT 0,
    date LONGTEXT DEFAULT '',
    category LONGTEXT DEFAULT '',
    status LONGTEXT DEFAULT '',
    description LONGTEXT DEFAULT '',
    refId LONGTEXT DEFAULT '',
    title LONGTEXT DEFAULT '',
    amountColor LONGTEXT DEFAULT '',
    isNegative INT DEFAULT 0,
    icon LONGTEXT DEFAULT '',
    iconBg LONGTEXT DEFAULT '',
    iconColor LONGTEXT DEFAULT '',
    linkedBatchId LONGTEXT DEFAULT '',
    linkedOrderId LONGTEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
, paymentMethod LONGTEXT DEFAULT '', referenceNo LONGTEXT DEFAULT '', notes LONGTEXT DEFAULT '', createdBy LONGTEXT DEFAULT 'Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(3,'t-1787142400339','Income',25000,'2026-08-19','Advance','Completed','','','Milton Advance payment ','',0,'','','','','','2026-08-19T12:26:40.339Z','2026-08-28T19:55:28.445Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(4,'t-1787142463909','Income',20000,'2026-08-19','Order Payment','Completed','','','Shalini cottons ','',0,'','','','','','2026-08-19T12:27:43.909Z','2026-08-23T19:13:16.886Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(5,'t-1787142585281','Expense',6000,'2026-08-19','Office Expense','Pending','','','Stitching ','',0,'','','','','','2026-08-19T12:29:45.281Z','2026-08-19T12:29:45.281Z','','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(6,'t-1787152562711','Expense',5590,'2026-08-19','Fabric Purchase','Completed','','','Thugil','',0,'','','','','','2026-08-19T15:16:02.711Z','2026-08-19T15:16:02.711Z','','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(7,'t-1787169163385','Expense',5000,'2026-08-19','Other','Completed','','','Cap','',0,'','','','','','2026-08-19T19:52:43.385Z','2026-08-19T19:52:43.385Z','','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(8,'t-1787169214548','Expense',3300,'2026-08-19','Other','Completed','','','Shirt purchase ','',0,'','','','','','2026-08-19T19:53:34.548Z','2026-08-19T19:53:34.548Z','','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(10,'t-1787256772001','Expense',6000,'2026-08-20','Office Expense','Completed','','','Machine purchase ','',0,'','','','','','2026-08-20T20:12:52.001Z','2026-08-26T06:36:56.045Z','Cash','','Cutting machine -5 k 
Scissors - 1000','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(11,'t-1787511290513','Expense',1200,'2026-08-21','Cutting','Completed','','','Milton Cutting wages','',0,'','','','','','2026-08-23T18:54:50.513Z','2026-08-23T18:54:50.513Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(12,'t-1787511355307','Expense',650,'2026-08-21','Transport','Completed','','','Bus Railsphere ','',0,'','','','','','2026-08-23T18:55:55.307Z','2026-08-23T18:55:55.307Z','Bank Transfer','','Transport ','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(13,'t-1787511403225','Expense',1500,'2026-08-21','Embroidery','Completed','','','Railsphere embroidery ','',0,'','','','','','2026-08-23T18:56:43.225Z','2026-08-23T18:56:43.225Z','Bank Transfer','','Railsphere 45pcs','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(14,'t-1787511454597','Expense',3000,'2026-08-21','Own expenses','Completed','','','SELF TRANSFER ','',0,'','','','','','2026-08-23T18:57:34.597Z','2026-08-23T18:57:34.597Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(15,'t-1787511542001','Expense',1150,'2026-08-21','Office Expense','Completed','','','Office ','',0,'','','','','','2026-08-23T18:59:02.001Z','2026-08-23T18:59:02.001Z','Bank Transfer','','Wires
Swatch card','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(16,'t-1787511732636','Expense',6500,'2026-08-24','Office Expense','Completed','','','Self transfer ','',0,'','','','','','2026-08-23T19:02:12.636Z','2026-08-23T19:02:39.160Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(17,'t-1787512495361','Expense',7125,'2026-08-24','Fabric Purchase','Completed','','','Cap Balance ','',0,'','','','','','2026-08-23T19:14:55.361Z','2026-08-24T13:45:03.892Z','Bank Transfer','','Railsphere 
Sania mirza cap ','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(18,'t-1787512619871','Income',16000,'2026-08-29','Balance','Completed','','','Milton balance ','',0,'','','','','','2026-08-23T19:16:59.871Z','2026-08-28T18:49:21.091Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(19,'t-1787513211260','Income',12700,'2026-08-28','Balance','Completed','','','Railsphere balance ','',0,'','','','','','2026-08-23T19:26:51.260Z','2026-08-28T18:48:13.924Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(20,'t-1787578398063','Expense',2500,'2026-08-24','Fabric Purchase','Completed','','','Fabric purchase ','',0,'','','','','','2026-08-24T13:33:18.063Z','2026-08-24T13:33:18.063Z','Bank Transfer','','Addidas salina - 5 kgs (SC)
Mirror black - 1200rs','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(21,'t-1787580490595','Expense',550,'2026-08-24','Transport','Completed','','','Cap transport','',0,'','','','','','2026-08-24T14:08:10.595Z','2026-08-24T14:08:10.595Z','Bank Transfer','','Transport ','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(22,'t-1787691835136','Expense',300,'2026-08-25','Transport','Completed','','','Milton auto','',0,'','','','','','2026-08-25T21:03:55.136Z','2026-08-25T21:03:55.136Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(23,'t-1787691875004','Expense',459,'2026-08-25','Self transfer','Completed','','','Self transfer ','',0,'','','','','','2026-08-25T21:04:35.004Z','2026-08-25T21:04:35.004Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(24,'t-1787692022203','Expense',2000,'2026-08-25','Printing','Completed','','','Sublimation ipl jersey','',0,'','','','','','2026-08-25T21:07:02.203Z','2026-08-28T19:03:12.762Z','Bank Transfer','','20 pcs','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(26,'t-1787943829824','Expense',5000,'2026-08-28','Own Expenses','Completed','','','House Rent ','',0,'','','','','','2026-08-28T19:03:49.824Z','2026-08-28T19:07:06.076Z','UPI','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(27,'t-1787943928027','Expense',860,'2026-08-26','Printing','Completed','','','Jaks sublimation ','',0,'','','','','','2026-08-28T19:05:28.027Z','2026-08-28T19:06:53.250Z','UPI','','Indian Hyderabad ','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(28,'t-1787944114740','Expense',870,'2026-08-28','Transport','Completed','','','Milton ','',0,'','','','','','2026-08-28T19:08:34.740Z','2026-08-28T19:08:34.740Z','Bank Transfer','','500-rapido
270 - parcel','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(29,'t-1787944163932','Expense',500,'2026-08-27','Cutting','Completed','','','Cutting master advance ','',0,'','','','','','2026-08-28T19:09:23.932Z','2026-08-28T19:09:23.932Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(30,'t-1787944568550','Expense',437,'2026-08-27','Fabric Purchase','Completed','','','Distn ','',0,'','','','','','2026-08-28T19:16:08.550Z','2026-08-28T19:16:08.550Z','Bank Transfer','','242-Paruthi 
195- Thugil','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(31,'t-1787945459662','Expense',1250,'2026-08-28','Salary','Completed','','','Stitching boys','',0,'','','','','','2026-08-28T19:30:59.662Z','2026-08-28T19:31:13.369Z','UPI','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(32,'t-1787946614681','Expense',450,'2026-08-28','Transport','Completed','','','Apache','',0,'','','','','','2026-08-28T19:50:14.681Z','2026-08-28T19:50:14.681Z','Bank Transfer','','26,27,28 aug','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(33,'t-1787946740134','Expense',3038,'2026-08-28','Own Expenses','Completed','','','OWN EXPENSES ','',0,'','','','','','2026-08-28T19:52:20.134Z','2026-08-28T19:56:22.000Z','UPI','','Bus - 980 
Petty selavugal ','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(34,'t-1787946860226','Expense',4471,'2026-08-28','Own Expenses','Completed','','','Self transfer ','',0,'','','','','','2026-08-28T19:54:20.226Z','2026-08-28T19:54:20.226Z','Bank Transfer','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(35,'t-1787947256203','Income',5025,'2026-08-28','Balance','Completed','','','Shalini ipl','',0,'','','','','','2026-08-28T20:00:56.203Z','2026-08-31T07:17:27.791Z','UPI','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(36,'t-1788004892425','Expense',2000,'2026-08-29','Salary','Completed','','','Stitching boys ','',0,'','','','','','2026-08-29T12:01:32.425Z','2026-08-29T12:01:32.425Z','UPI','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(37,'t-1788160577823','Income',5000,'2026-08-29','Advance','Completed','','','Aagam advance ','',0,'','','','','','2026-08-31T07:16:17.823Z','2026-08-31T07:16:33.266Z','UPI','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(38,'t-1788160627140','Expense',5000,'2026-08-31','Stitching','Completed','','','Bag advance ','',0,'','','','','','2026-08-31T07:17:07.140Z','2026-09-03T15:50:56.380Z','UPI','','','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(41,'t-1788285905886','Expense',12000,'2026-09-01','Own Expenses','Completed','','','Banglore expenses ','',0,'','','','','','2026-09-01T18:05:05.886Z','2026-09-03T22:23:09.317Z','UPI','','29,30,31 august 
1 September ','Admin');
INSERT INTO `transactions` (`_rowid`,`id`,`type`,`amount`,`date`,`category`,`status`,`description`,`refId`,`title`,`amountColor`,`isNegative`,`icon`,`iconBg`,`iconColor`,`linkedBatchId`,`linkedOrderId`,`createdAt`,`updatedAt`,`paymentMethod`,`referenceNo`,`notes`,`createdBy`) VALUES(59,'t-1788286627356','Expense',500,'2026-08-31','Own Expenses','Completed','','','Kotak ATM card ','',0,'','','','','','2026-09-01T18:17:07.356Z','2026-09-01T18:17:07.356Z','Bank Transfer','','','Admin');
CREATE TABLE costings (
    `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(191) UNIQUE NOT NULL,
    styleRef LONGTEXT DEFAULT '',
    clientId LONGTEXT DEFAULT '',
    totalUnitCost DOUBLE DEFAULT 0,
    retailPrice DOUBLE DEFAULT 0,
    status LONGTEXT DEFAULT 'Draft',
    date LONGTEXT DEFAULT '',
    materials LONGTEXT DEFAULT '[]',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
, uData LONGTEXT DEFAULT '');
INSERT INTO `costings` (`_rowid`,`id`,`styleRef`,`clientId`,`totalUnitCost`,`retailPrice`,`status`,`date`,`materials`,`createdAt`,`updatedAt`,`uData`) VALUES(5,'cost-1787257604220','T-Shirt','Milton school ',88.57045297365454,190,'Saved','2026-08-20','[{`name`:`Fabric`,`cost`:42.03045297365455},{`name`:`CMT`,`cost`:39.019999999999996},{`name`:`Printing`,`cost`:0},{`name`:`Allowances`,`cost`:7.52}]','2026-08-20T20:26:44.037Z','2026-08-20T20:26:44.037Z','');
INSERT INTO `costings` (`_rowid`,`id`,`styleRef`,`clientId`,`totalUnitCost`,`retailPrice`,`status`,`date`,`materials`,`createdAt`,`updatedAt`,`uData`) VALUES(11,'cost-1787510213772','T-Shirt','Shalini Cottons',220.99,300,'Saved','2026-08-23','[{`name`:"Fabric Cost/pc",`unit`:"per pc",`cost`:89.95},{`name`:"Fabric Price/kg",`unit`:"per kg",`cost`:257},{`name`:"Pcs per kg",`unit`:`count`,`cost`:3},{`name`:`Wastage`,`unit`:"%",`cost`:5},{`name`:`Cutting`,`unit`:"per pc",`cost`:9.6},{`name`:`Wages`,`unit`:"per pc",`cost`:58},{`name`:`Packing`,`unit`:"per pc",`cost`:5},{`name`:`Printing`,`unit`:"per pc",`cost`:52},{`name`:`Sublimation`,`unit`:"per pc",`cost`:6.4},{`name`:`Overheads`,`unit`:"per pc",`cost`:0.04}]','2026-08-23T18:36:54.107Z','2026-08-23T18:36:54.107Z','{`qty`:125,`pcsPerKg`:3,`garmentType`:"T-Shirt",`cmtMode`:`separate`,`fabricPriceKg`:257,`wastage`:5,`fabricCostPc`:89.95,`cmt`:0,`cutting`:9.6,`fusing`:0,`wages`:58,`packing`:5,`printing`:52,`sublimation`:6.4,`allowances`:0,`overheads`:0.04,`acc1`:0,`acc2`:0,`acc3`:0,`pattern`:0,`cp`:220.99,`totalCost`:27623.75,`sp`:300,`profitPct`:35.7527489931671,`totalSales`:37500,`profitDone`:9876.25,`lastEdited`:"sp-pc",`clientName`:"Shalini Cottons"}');
INSERT INTO `costings` (`_rowid`,`id`,`styleRef`,`clientId`,`totalUnitCost`,`retailPrice`,`status`,`date`,`materials`,`createdAt`,`updatedAt`,`uData`) VALUES(12,'cost-1787514507780','T-Shirt','Shalini Cottons',226.99,300,'Saved','2026-08-23','[{`name`:"Fabric Cost/pc",`unit`:"per pc",`cost`:89.95},{`name`:"Fabric Price/kg",`unit`:"per kg",`cost`:257},{`name`:"Pcs per kg",`unit`:`count`,`cost`:3},{`name`:`Wastage`,`unit`:"%",`cost`:5},{`name`:`Cutting`,`unit`:"per pc",`cost`:9.6},{`name`:`Wages`,`unit`:"per pc",`cost`:58},{`name`:`Packing`,`unit`:"per pc",`cost`:5},{`name`:`Printing`,`unit`:"per pc",`cost`:58},{`name`:`Sublimation`,`unit`:"per pc",`cost`:6.4},{`name`:`Overheads`,`unit`:"per pc",`cost`:0.04}]','2026-08-23T19:48:28.254Z','2026-08-23T19:48:28.254Z','{`qty`:125,`pcsPerKg`:3,`garmentType`:"T-Shirt",`cmtMode`:`separate`,`fabricPriceKg`:257,`wastage`:5,`fabricCostPc`:89.95,`cmt`:0,`cutting`:9.6,`fusing`:0,`wages`:58,`packing`:5,`printing`:58,`sublimation`:6.4,`allowances`:0,`overheads`:0.04,`acc1`:0,`acc2`:0,`acc3`:0,`pattern`:0,`cp`:226.99,`totalCost`:28373.75,`sp`:300,`profitPct`:32.1644125291863,`totalSales`:37500,`profitDone`:9126.25,`lastEdited`:"sp-pc",`clientName`:"Shalini Cottons"}');
INSERT INTO `costings` (`_rowid`,`id`,`styleRef`,`clientId`,`totalUnitCost`,`retailPrice`,`status`,`date`,`materials`,`createdAt`,`updatedAt`,`uData`) VALUES(14,'cost-1787647934011','T-Shirt','Nagarajan',122,200,'Saved','2026-08-25','[{`name`:"Fabric Cost/pc",`unit`:"per pc",`cost`:48},{`name`:"CMT (combined)",`unit`:"per pc",`cost`:23},{`name`:`Printing`,`unit`:"per pc",`cost`:12},{`name`:`Sublimation`,`unit`:"per pc",`cost`:8},{`name`:`Allowances`,`unit`:"per pc",`cost`:2},{`name`:`Overheads`,`unit`:"per pc",`cost`:5},{`name`:"Accessory 1",`unit`:`lump`,`cost`:6000}]','2026-08-25T08:52:14.152Z','2026-08-25T08:52:14.152Z','{`qty`:250,`pcsPerKg`:0,`garmentType`:"T-Shirt",`cmtMode`:`combined`,`fabricPriceKg`:0,`wastage`:0,`fabricCostPc`:48,`cmt`:23,`cutting`:0,`fusing`:0,`wages`:0,`packing`:0,`printing`:12,`sublimation`:8,`allowances`:2,`overheads`:5,`acc1`:6000,`acc2`:0,`acc3`:0,`pattern`:0,`cp`:122,`totalCost`:30500,`sp`:200,`profitPct`:63.934426229508205,`totalSales`:50000,`profitDone`:19500,`lastEdited`:"sp-pc",`clientName`:`Nagarajan`}');
CREATE TABLE shipments (
    `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(191) UNIQUE NOT NULL,
    customerName LONGTEXT DEFAULT '',
    invoiceNo LONGTEXT DEFAULT '',
    status LONGTEXT DEFAULT '',
    courier LONGTEXT DEFAULT '',
    trackingNo LONGTEXT DEFAULT '',
    expectedDate LONGTEXT DEFAULT '',
    boxes INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE quotations (
    `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(191) UNIQUE NOT NULL,
    customerId LONGTEXT NOT NULL,
    customerName LONGTEXT NOT NULL,
    date LONGTEXT NOT NULL,
    status LONGTEXT DEFAULT 'Draft',
    showFabric INT DEFAULT 0,
    showColour INT DEFAULT 0,
    showTax INT DEFAULT 1,
    items LONGTEXT DEFAULT '[]',
    totalAmount DOUBLE DEFAULT 0,
    notes LONGTEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO `quotations` (`_rowid`,`id`,`customerId`,`customerName`,`date`,`status`,`showFabric`,`showColour`,`showTax`,`items`,`totalAmount`,`notes`,`createdAt`,`updatedAt`) VALUES(2,'QT-33531','c-1787099120799','Sai Sharvesh','2026-08-19','Rejected',0,0,0,'[{`name`:"Polo Tshirt",`fabric`:"",`colour`:"",`qty`:25,`rate`:250,`taxPerPc`:0,`total`:6250},{`name`:`Jersey`,`fabric`:"",`colour`:"",`qty`:260,`rate`:150,`taxPerPc`:0,`total`:39000}]',45250,'','2026-08-19T01:27:32.247Z','2026-08-19T04:59:16.018Z');
INSERT INTO `quotations` (`_rowid`,`id`,`customerId`,`customerName`,`date`,`status`,`showFabric`,`showColour`,`showTax`,`items`,`totalAmount`,`notes`,`createdAt`,`updatedAt`) VALUES(4,'QT-77195','c-1787142155727','Milton school','2026-08-19','Accepted',0,0,0,'[{`name`:"Polyester round neck tshirt",`fabric`:"",`colour`:"",`qty`:133,`rate`:190,`taxPerPc`:0,`total`:25270},{`name`:`Caps`,`fabric`:"",`colour`:"",`qty`:133,`rate`:130,`taxPerPc`:0,`total`:17290}]',42560,'Honeycomb tshirts - 2 colours','2026-08-19T12:24:01.766Z','2026-08-20T20:40:13.653Z');
CREATE TABLE users (
    `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(191) UNIQUE NOT NULL,
    `username` VARCHAR(191) UNIQUE NOT NULL,
    password_hash LONGTEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO `users` (`_rowid`,`id`,`username`,`password_hash`,`createdAt`) VALUES(1,'u-admin','Udhayaa textiles','b3a8e0e1f9ab1bfe3a36f231f676f78bb30a519d2b21e6c530c0eee8ebb4a5d0','2026-08-24 09:51:40');
CREATE TABLE sessions (
    `token` VARCHAR(191) PRIMARY KEY,
    userId LONGTEXT NOT NULL,
    expiresAt BIGINT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('c02b5a77-493a-41fc-8a43-d8eba50bef10','u-admin',1787570956892,'2026-08-24 10:29:16');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('d4872be4-e169-4cc7-860a-c86544811977','u-admin',1787581912845,'2026-08-24 13:31:52');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('98c5ec29-21f6-4e55-9a3f-73a6d5f04a16','u-admin',1787608797258,'2026-08-24 20:59:57');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('e4cee085-4964-458a-930a-55427839fbdd','u-admin',1787651228437,'2026-08-25 08:47:08');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('02d50119-56cf-4d1b-a621-524c52c90f74','u-admin',1787651413531,'2026-08-25 08:50:13');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('50ecc58f-9983-4418-979f-79743ad02672','u-admin',1787657883172,'2026-08-25 10:38:03');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('752dce4d-87f4-4b20-a345-18c4b11da6b9','u-admin',1787668359253,'2026-08-25 13:32:39');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('9f539ec3-a618-4ca2-ad60-8e66c22e2f6f','u-admin',1787668366809,'2026-08-25 13:32:46');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('fef01b6b-8444-4bf8-b3a5-508d78c9ef3c','u-admin',1787684837179,'2026-08-25 18:07:17');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('b03b7dd2-cbce-4ffb-9b6b-4555dc86f16d','u-admin',1787695412755,'2026-08-25 21:03:32');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('3457bf40-73bb-4f77-a0f1-bd9ab9dfd801','u-admin',1787726605015,'2026-08-26 05:43:25');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('c06452eb-f5e4-4106-b7d2-86b314e9649a','dev-admin',1787728142225,'2026-08-26 06:09:02');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('7c9d4d24-8a8d-4717-bf6a-96e85c73df99','u-admin',1787728197526,'2026-08-26 06:09:57');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('223cfdec-a43a-4e91-b095-a1dadfb5cae8','u-admin',1787728436720,'2026-08-26 06:13:56');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('c26c7d5f-8229-4697-adcf-7d81cdac16ac','u-admin',1787730373565,'2026-08-26 06:46:13');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('4cefc5cb-10a6-42e8-887d-04f447459121','dev-admin',1787732936917,'2026-08-26 07:28:56');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('1271425a-8011-4faa-966f-426389e79bf0','u-admin',1787946390962,'2026-08-28 18:46:30');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('be56d448-6c0d-4aaa-aec6-3012efbdf179','u-admin',1787949661474,'2026-08-28 19:41:01');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('af7949b1-d29f-4a28-9e2a-1a74546ed08f','u-admin',1787950187857,'2026-08-28 19:49:47');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('91afb3c8-bcce-4ebb-b3dd-bcf7c299fefc','u-admin',1787966719609,'2026-08-29 00:25:19');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('66214b0b-3737-46b3-9352-4c89d6d0ef87','u-admin',1788008472547,'2026-08-29 12:01:12');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('917187b7-6849-44d3-bc08-b2e8b35d4476','u-admin',1788164078732,'2026-08-31 07:14:38');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('90951a26-6e64-443f-9c38-162ef334dda4','u-admin',1788289444981,'2026-09-01 18:04:04');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('ba78082f-738c-4ead-b2d3-d7e94198b748','u-admin',1788289543814,'2026-09-01 18:05:43');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('83f8cffd-1b87-4dd9-ba70-967dc9468686','u-admin',1788453606201,'2026-09-03 15:40:06');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('136f9fae-9e84-45c2-b743-b3ce05962ff7','u-admin',1788465251142,'2026-09-03 18:54:11');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('aa989b12-041a-4402-aca4-8d53efc8e402','u-admin',1788477758203,'2026-09-03 22:22:38');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('c690ac21-9ee7-4617-8bab-7d3a49b07f3d','u-admin',1788543752741,'2026-09-04 16:42:32');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('3814041c-52cc-4e68-a11f-6f0246099311','u-admin',1788609262633,'2026-09-05 10:54:22');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('c7eb6a9b-5746-472c-9cd9-a01192a7fa94','u-admin',1788710550634,'2026-09-06 15:02:30');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('48881ddb-2750-4ecc-a295-d8b7a6dcddfd','u-admin',1788724639202,'2026-09-06 18:57:19');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('25cd40e0-cbe9-4286-a529-bdd71b729757','u-admin',1788725161001,'2026-09-06 19:06:00');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('9a002c96-bd65-4166-92a0-94af6597e99e','u-admin',1788725203069,'2026-09-06 19:06:43');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('ec5d631a-8402-4f41-a796-4b269c0d0e45','u-admin',1788725316508,'2026-09-06 19:08:36');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('907db77a-af4c-43e1-ae20-9a0889d67953','u-admin',1788750339545,'2026-09-07 02:05:39');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('552ad926-4248-43f6-854f-861ae29a37be','u-admin',1788915468295,'2026-09-08 23:57:48');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('5a00e300-c8bb-410d-9388-f9b79d0bf102','u-admin',1788916103429,'2026-09-09 00:08:23');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('8fdafa2e-1046-46e6-91b7-aa740a6bea37','u-admin',1788917394069,'2026-09-09 00:29:54');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('799c77ed-21de-413b-b742-4d1d986abc4a','u-admin',1788917554614,'2026-09-09 00:32:34');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('0ca3cd57-6d3f-4c3b-9096-68c84edfb603','u-admin',1788917611097,'2026-09-09 00:33:31');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('f9d0d6f1-3865-4c02-81b2-0cca3c756dbf','u-admin',1788919501279,'2026-09-09 01:05:01');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('69f1c512-f7c4-44fe-83a3-e9086e967db3','u-admin',1788956304641,'2026-09-09 11:18:24');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('ce2c6a8a-08d2-4ae1-a694-55a0879049df','u-admin',1788974690688,'2026-09-09 16:24:50');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('8a11da2f-d7a8-422a-a8cf-fb10ab6a6b24','u-admin',1788978078211,'2026-09-09 17:21:18');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('31d90cc2-6cbf-4f0b-9ee2-5b8a89fbf37d','u-admin',1788990876307,'2026-09-09 20:54:36');
INSERT INTO `sessions` (`token`,`userId`,`expiresAt`,`createdAt`) VALUES('6bd2d83b-d594-497c-a324-ec2284391995','u-admin',1788999015242,'2026-09-09 23:10:15');


COMMIT;
SET FOREIGN_KEY_CHECKS=1;
