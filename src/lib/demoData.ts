import { Product } from './types'

export const DEMO_PRODUCTS: Product[] = [
  { sku:'101016', name:'My Organics Angel Potion 100ml', stock:1066, cost:3.20, retail:11.94, vendor:'My Organics', store:'store1', barcode:'8388765612624', leadTimeDays:30 },
  { sku:'100971', name:'My Organics Purify Shampoo Rosemary 1000ml', stock:162, cost:4.50, retail:15.72, vendor:'My Organics', store:'store1', barcode:'8388765440654', leadTimeDays:30 },
  { sku:'1036430314', name:'My Organics Skin Elixir 12 Vials', stock:95, cost:8.00, retail:23.64, vendor:'My Organics', store:'store1', barcode:'8388765609648', leadTimeDays:30 },
  { sku:'100970', name:'My Organics Purify Shampoo Rosemary 250ml', stock:320, cost:3.00, retail:11.16, vendor:'My Organics', store:'store1', barcode:'8388765440647', leadTimeDays:30 },
  { sku:'1036430311', name:'My Organics Revitalizing Elixir 12 Vials', stock:77, cost:7.50, retail:18.83, vendor:'My Organics', store:'store1', barcode:'8852015283086', leadTimeDays:30 },
  { sku:'100978', name:'My Organics Thickening Shampoo 1000ml', stock:107, cost:4.20, retail:17.31, vendor:'My Organics', store:'store1', barcode:'8388765440678', leadTimeDays:30 },
  { sku:'100957', name:'My Organics Hydrating Shampoo Sweet Fennel 1000ml', stock:94, cost:4.20, retail:15.18, vendor:'My Organics', store:'store1', barcode:'8388765440638', leadTimeDays:30 },
  { sku:'1036430016', name:'My Organics Neem Oil 100ml', stock:149, cost:5.50, retail:14.32, vendor:'My Organics', store:'store1', barcode:'8388765609631', leadTimeDays:30 },
  { sku:'101015', name:'My Organics Miracle Mask 500ml', stock:104, cost:6.00, retail:12.77, vendor:'My Organics', store:'store1', barcode:'8388765617247', leadTimeDays:30 },
  { sku:'100960', name:'My Organics Hydrating Conditioner 1000ml', stock:67, cost:4.00, retail:12.48, vendor:'My Organics', store:'store1', barcode:'8388765440692', leadTimeDays:30 },
  { sku:'100961', name:'My Organics Hydrating Serum 50ml', stock:166, cost:5.80, retail:12.39, vendor:'My Organics', store:'store1', barcode:'8388765448784', leadTimeDays:30 },
  { sku:'100927', name:'My Organics Stand With Black Top Large', stock:6, cost:12.00, retail:11.88, vendor:'My Organics', store:'store1', barcode:'', leadTimeDays:30 },
  { sku:'101013', name:'My Organics Supreme Shampoo 1000ml', stock:73, cost:4.50, retail:11.78, vendor:'My Organics', store:'store1', barcode:'8388765448784', leadTimeDays:30 },
  { sku:'101014', name:'My Organics Miracle Mask 200ml', stock:141, cost:3.80, retail:11.45, vendor:'My Organics', store:'store1', barcode:'8388765612617', leadTimeDays:30 },
  { sku:'101008', name:'My Organics After Colour Protect Shampoo 1000ml', stock:70, cost:4.20, retail:11.32, vendor:'My Organics', store:'store1', barcode:'8388765609938', leadTimeDays:30 },
  { sku:'100058', name:'Agenda Nitrile Gloves Pink Small 100pcs', stock:2, cost:2.50, retail:6.20, vendor:'Agenda', store:'store2', barcode:'5060167720413', leadTimeDays:5 },
  { sku:'100033', name:'Agenda Nitrile Gloves Medium Black', stock:3, cost:2.50, retail:6.20, vendor:'Agenda', store:'store2', barcode:'5060318410583', leadTimeDays:5 },
  { sku:'100027', name:'Agenda Gloves Vinyl Powder Free Medium', stock:0, cost:2.20, retail:5.80, vendor:'Agenda', store:'store2', barcode:'5060318410248', leadTimeDays:5 },
  { sku:'100037', name:'Agenda Disposable Shoulder Capes Black', stock:0, cost:1.80, retail:4.90, vendor:'Agenda', store:'store2', barcode:'5060167720088', leadTimeDays:5 },
  { sku:'100059', name:'Agenda Nitrile Gloves Pink Medium 100pcs', stock:0, cost:2.50, retail:6.20, vendor:'Agenda', store:'store2', barcode:'5060167720428', leadTimeDays:5 },
  { sku:'1036430999', name:'Agenda Nitrile Gloves Medium Blue', stock:17, cost:2.50, retail:6.20, vendor:'Agenda', store:'store2', barcode:'5060318418675', leadTimeDays:5 },
  { sku:'100034', name:'Agenda Nitrile Gloves Large Black', stock:9, cost:2.50, retail:6.20, vendor:'Agenda', store:'store2', barcode:'5060318410590', leadTimeDays:5 },
  { sku:'100041', name:'Agenda Disposable Shoulder Capes Clear', stock:5, cost:1.80, retail:4.90, vendor:'Agenda', store:'store2', barcode:'5060167720024', leadTimeDays:5 },
  { sku:'100032', name:'Agenda Nitrile Gloves Small Black', stock:9, cost:2.50, retail:6.20, vendor:'Agenda', store:'store2', barcode:'5060318410576', leadTimeDays:5 },
  { sku:'100076', name:'Agenda Appointment Cards Purple/White 100pcs', stock:2, cost:3.50, retail:7.80, vendor:'Agenda', store:'store2', barcode:'5060167720718', leadTimeDays:5 },
  { sku:'100028', name:'Agenda Gloves Vinyl Powder Free Large', stock:7, cost:2.20, retail:5.80, vendor:'Agenda', store:'store2', barcode:'5060318410255', leadTimeDays:5 },
]

export const DEMO_SALES_30D: Record<string, number> = {
  '101016':18,'100971':12,'1036430314':8,'100970':15,'1036430311':6,
  '100978':14,'100957':10,'1036430016':9,'101015':7,'100960':5,
  '100961':11,'100927':0,'101013':8,'101014':6,'101008':9,
  '100058':45,'100033':40,'100027':55,'100037':30,'100059':50,
  '1036430999':22,'100034':38,'100041':28,'100032':42,'100076':15,'100028':35,
}
