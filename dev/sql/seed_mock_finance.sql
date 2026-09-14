-- Clear existing generic transactions and insert realistic garment factory transactions
DELETE FROM transactions;

INSERT INTO transactions (id, type, title, category, amount, status, paymentMethod, date, refId, referenceNo, isNegative, attachments) VALUES
('txn-201', 'Income', 'Advance 50% - ORD-4190 (8.5k Chinos)', 'Sales', 520000, 'Completed', 'Bank Transfer', '2026-08-14', 'c-026', 'TRF-884920', 0, '[{"id":"att-mock-01","name":"Advance_Payment_TRF-884920.pdf","type":"application/pdf","size":48200,"dataUrl":"data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDM2Pj5zdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGRNCihTYW1wbGUgUGF5bWVudCBWb3VjaGVyKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PmVuZG9iagozIDAgb2JqCjw8L1R5cGUgL1BhZ2UKL1BhcmVudCAxIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgMiAwIFIKL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDw8L1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhPj4+Pj4+CmVuZG9iago0IDAgb2JqCjw8L1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAxMTYgMDAwMDAgbiAKMDAwMDAwMDAxOSAwMDAwMCBuIAowMDAwMDAwMTc1IDAwMDAwIG4gCjAwMDAwMDAzMDUgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDUKL1Jvb3QgNCAwIFIKPj4Kc3RhcnR4cmVmCjM1NwolJUVPRg==","uploadedAt":"2026-08-14T10:30:00.000Z"}]'),
('txn-202', 'Income', 'Invoice #INV-2026-88 (Sharma Co.)', 'Sales', 285000, 'Pending', 'Bank Transfer', '2026-09-08', 'c-021', 'INV-2026-88', 0),
('txn-203', 'Income', 'Final Settlement - ORD-4816 (Polo Shirts)', 'Sales', 710000, 'Completed', 'Net Banking', '2026-09-02', 'c-020', 'TRF-902141', 0),
('txn-204', 'Income', 'Custom Sample Printing Deposit', 'Sampling', 45000, 'Completed', 'UPI', '2026-08-28', 'c-019', 'UPI-4920182', 0),
('txn-205', 'Income', 'Export Shipment Invoice #EXP-26-04', 'Export', 560000, 'Pending', 'Bank Transfer', '2026-09-05', 'c-010', 'EXP-26-04', 0),
('txn-206', 'Income', 'Quarterly Brand Retainer - Royal Threads', 'Retainer', 125000, 'Completed', 'Bank Transfer', '2026-09-10', 'c-001', 'TRF-102938', 0),
('txn-207', 'Income', 'Scrap Fabric & Cut-End Surplus Sale', 'Scrap Sale', 24500, 'Completed', 'Cash', '2026-09-07', NULL, 'CSH-77401', 0),
('txn-208', 'Expense', 'Organic Cotton Jersey Roll Stock (4,500m)', 'Raw Material', 540000, 'Completed', 'Bank Transfer', '2026-08-10', NULL, 'PO-FAB-882', 1),
('txn-209', 'Expense', 'Dyeing & Chemical Pigment Lot #99', 'Processing', 68500, 'Completed', 'UPI', '2026-08-22', NULL, 'UPI-992019', 1),
('txn-210', 'Expense', 'Monthly Industrial Power & HT Electricity', 'Utilities', 48200, 'Completed', 'Net Banking', '2026-09-01', NULL, 'UTIL-EB-901', 1),
('txn-211', 'Expense', 'YKK Zippers & Metallic Buttons - Thread House', 'Trims', 35000, 'Pending', 'Bank Transfer', '2026-09-04', 'v-002', 'BILL-TH-441', 1),
('txn-212', 'Expense', 'Juki Sewing Machine Overhaul & Servicing', 'Maintenance', 18400, 'Completed', 'Cash', '2026-09-06', NULL, 'CSH-MNT-06', 1),
('txn-213', 'Expense', 'Weekly Floor Operator Overtime & Wages', 'Wages', 64200, 'Completed', 'Cash', '2026-09-09', NULL, 'CSH-WAG-09', 1),
('txn-214', 'Expense', 'Corrugated Export Outer Boxes & Polybags', 'Packaging', 28000, 'Pending', 'UPI', '2026-09-11', NULL, 'BILL-PKG-11', 1),
('txn-215', 'Expense', 'BlueDart Express Dispatch Freight', 'Logistics', 42600, 'Completed', 'Net Banking', '2026-09-03', NULL, 'EXP-BD-903', 1),
('txn-216', 'Expense', 'Screen Printing Mesh & Plastisol Inks', 'Processing', 32500, 'Completed', 'UPI', '2026-08-30', NULL, 'UPI-INK-830', 1),
('txn-217', 'Income', 'Custom Embroidery Sample Order - Brand Y', 'Sampling', 38000, 'Completed', 'UPI', '2026-09-04', 'c-021', 'UPI-884021', 0),
('txn-218', 'Expense', 'Raagi Fabrics Raw Linen Invoice', 'Raw Material', 125000, 'Pending', 'Bank Transfer', '2026-09-07', 'v-001', 'BILL-RF-907', 1);
