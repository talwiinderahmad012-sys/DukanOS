import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { calculateGrowth, getMonthlyRange, getYearlyRange } from '@/lib/utils/date-utils';
import { SaleStatus, PurchaseStatus } from '@/generated/prisma/client';
import type { GrowthResult } from '@/lib/utils/date-utils';

export type { GrowthResult };
export type AnalyticsPeriod = { start: Date; end: Date; label: string };
export type KPIData = { current: number; previous: number; growth: GrowthResult };
export type MonthlyGrowthRow = { month: number; monthName: string; year: number; revenue: number; grossProfit: number; expenses: number; netProfit: number; orders: number; avgOrderValue: number; growthPercent: number | null; growthStatus: string };
export type TopProduct = { productId: string; name: string; sku?: string | null; unit: string; currentStock: number; quantitySold: number; revenue: number; profit: number; profitMarginPercent: number };
export type SlowProduct = { productId: string; name: string; sku?: string | null; unit: string; currentStock: number; purchasePrice: number; stockValue: number; lastSaleDate: Date | null; daysSinceLastSale: number };
export type TopCustomer = { customerId: string; name: string; phone?: string | null; totalSpent: number; orderCount: number; outstanding: number; lastPurchaseDate: Date | null };
export type BranchStat = { branchId: string; branchName: string; branchCode: string; revenue: number; grossProfit: number; expenses: number; netProfit: number; orderCount: number };
export type DecliningProduct = { productId: string; name: string; sku?: string | null; unit: string; currentStock: number; previousRevenue: number; currentRevenue: number; declinePercent: number | null; declineAmount: number };
export type BestProfitProduct = { productId: string; name: string; sku?: string | null; unit: string; currentStock: number; revenue: number; profit: number; profitMarginPercent: number };
export type ExpenseCategoryStat = { category: string; amount: number; percentage: number };
export type PayrollAnalytics = { totalPayroll: number; paidPayroll: number; pendingPayroll: number; employeeCount: number; attendancePercentage: number | null; leaveUsage: number };
export type SalesByPaymentMethod = { method: string; count: number; revenue: number; percentage: number };
export type SalesByCategory = { categoryId: string; categoryName: string; revenue: number; profit: number; orders: number; percentage: number };

function kpi(current: number, previous: number): KPIData {
  return { current, previous, growth: calculateGrowth(current, previous) };
}

export function getCurrentMonthPeriods(): { period: AnalyticsPeriod; comparisonPeriod: AnalyticsPeriod } {
  const now   = new Date();
  const thisM = getMonthlyRange(now.getFullYear(), now.getMonth() + 1);
  const pmNum = now.getMonth() === 0 ? 12 : now.getMonth();
  const pmYear= now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevM = getMonthlyRange(pmYear, pmNum);
  return {
    period:           { start: thisM.start, end: thisM.end, label: 'This Month' },
    comparisonPeriod: { start: prevM.start, end: prevM.end, label: 'Last Month' },
  };
}

export async function getAnalyticsKPIs(
  businessId: string,
  period: AnalyticsPeriod,
  comparisonPeriod: AnalyticsPeriod,
  branchId?: string
) {
  const bf = branchId ? { branchId } : {};
  const [cS, pS, cI, pI, cE, pE, cP, pP, custAgg] = await Promise.all([
    prisma.sale.aggregate({ where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: period.start, lte: period.end }, ...bf }, _sum: { total: true }, _count: { id: true } }),
    prisma.sale.aggregate({ where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: comparisonPeriod.start, lte: comparisonPeriod.end }, ...bf }, _sum: { total: true }, _count: { id: true } }),
    prisma.saleItem.aggregate({ where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: period.start, lte: period.end }, ...bf } }, _sum: { quantity: true, lineProfit: true } }),
    prisma.saleItem.aggregate({ where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: comparisonPeriod.start, lte: comparisonPeriod.end }, ...bf } }, _sum: { quantity: true, lineProfit: true } }),
    prisma.expense.aggregate({ where: { businessId, cancelledAt: null, date: { gte: period.start, lte: period.end }, ...bf }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { businessId, cancelledAt: null, date: { gte: comparisonPeriod.start, lte: comparisonPeriod.end }, ...bf }, _sum: { amount: true } }),
    prisma.purchase.aggregate({ where: { businessId, status: PurchaseStatus.RECEIVED, purchaseDate: { gte: period.start, lte: period.end }, ...(branchId ? { branchId } : {}) }, _sum: { total: true } }),
    prisma.purchase.aggregate({ where: { businessId, status: PurchaseStatus.RECEIVED, purchaseDate: { gte: comparisonPeriod.start, lte: comparisonPeriod.end }, ...(branchId ? { branchId } : {}) }, _sum: { total: true } }),
    prisma.customer.aggregate({ where: { businessId, isActive: true }, _sum: { outstanding: true } }),
  ]);
  const cr=Number(cS._sum.total||0), pr=Number(pS._sum.total||0);
  const co=cS._count.id, po=pS._count.id;
  const cgp=Number(cI._sum.lineProfit||0), pgp=Number(pI._sum.lineProfit||0);
  const ce=Number(cE._sum.amount||0), pe=Number(pE._sum.amount||0);
  return {
    totalSales: kpi(cr,pr), grossProfit: kpi(cgp,pgp), expenses: kpi(ce,pe),
    netProfit: kpi(cgp-ce, pgp-pe),
    totalPurchases: kpi(Number(cP._sum.total||0), Number(pP._sum.total||0)),
    outstandingUdhaar: { current: Number(custAgg._sum.outstanding||0) },
    productsSold: kpi(Number(cI._sum.quantity||0), Number(pI._sum.quantity||0)),
    avgOrderValue: kpi(co>0?cr/co:0, po>0?pr/po:0),
    orderCount: kpi(co,po),
  };
}

export async function getSalesTrend(businessId: string, days: number, timezone: string, branchId?: string) {
  const endDate = new Date();
  const startDate = new Date(); startDate.setDate(startDate.getDate()-(days-1)); startDate.setHours(0,0,0,0);
  const sales = await prisma.sale.findMany({
    where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: startDate, lte: endDate }, ...(branchId?{branchId}:{}) },
    include: { items: { select: { lineProfit: true } } }, orderBy: { saleDate: 'asc' },
  });
  const map = new Map<string, { date: string; revenue: number; profit: number; orders: number }>();
  for (let i=0; i<days; i++) {
    const d=new Date(startDate); d.setDate(d.getDate()+i);
    const key=d.toISOString().split('T')[0]; map.set(key,{date:key,revenue:0,profit:0,orders:0});
  }
  for (const s of sales) {
    const key=s.saleDate.toISOString().split('T')[0]; const slot=map.get(key);
    if(slot){slot.revenue+=Number(s.total);slot.profit+=s.items.reduce((a,i)=>a+Number(i.lineProfit),0);slot.orders+=1;}
  }
  return Array.from(map.values());
}

export async function getMonthlyGrowthTable(businessId: string, year: number, timezone: string): Promise<MonthlyGrowthRow[]> {
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const yr=getYearlyRange(year);
  const [sales, exps] = await Promise.all([
    prisma.sale.findMany({ where:{businessId,status:SaleStatus.COMPLETED,saleDate:{gte:yr.start,lte:yr.end}}, select:{total:true,saleDate:true,items:{select:{lineProfit:true}}} }),
    prisma.expense.findMany({ where:{businessId,cancelledAt:null,date:{gte:yr.start,lte:yr.end}}, select:{amount:true,date:true} }),
  ]);
  const rows: MonthlyGrowthRow[]=[];
  let prevRev=0;
  for(let m=1;m<=12;m++){
    const r=getMonthlyRange(year,m);
    const ms=sales.filter(s=>s.saleDate>=r.start&&s.saleDate<=r.end);
    const me=exps.filter(e=>e.date>=r.start&&e.date<=r.end);
    const rev=ms.reduce((s,sl)=>s+Number(sl.total),0);
    const gp=ms.reduce((s,sl)=>s+sl.items.reduce((ps,i)=>ps+Number(i.lineProfit),0),0);
    const exp=me.reduce((s,e)=>s+Number(e.amount),0);
    const orders=ms.length; const avg=orders>0?rev/orders:0;
    const g=calculateGrowth(rev,prevRev);
    rows.push({month:m,monthName:MONTHS[m-1],year,revenue:rev,grossProfit:gp,expenses:exp,netProfit:gp-exp,orders,avgOrderValue:avg,growthPercent:g.percentage,growthStatus:g.status});
    prevRev=rev;
  }
  return rows;
}

export async function getYearlyComparison(businessId: string, timezone: string) {
  const now=new Date(); const ty=getYearlyRange(now.getFullYear()); const py=getYearlyRange(now.getFullYear()-1);
  const [cS,pS,cI,pI,cE,pE,cC,pC]=await Promise.all([
    prisma.sale.aggregate({where:{businessId,status:SaleStatus.COMPLETED,saleDate:{gte:ty.start,lte:ty.end}},_sum:{total:true},_count:{id:true}}),
    prisma.sale.aggregate({where:{businessId,status:SaleStatus.COMPLETED,saleDate:{gte:py.start,lte:py.end}},_sum:{total:true},_count:{id:true}}),
    prisma.saleItem.aggregate({where:{sale:{businessId,status:SaleStatus.COMPLETED,saleDate:{gte:ty.start,lte:ty.end}}},_sum:{lineProfit:true,quantity:true}}),
    prisma.saleItem.aggregate({where:{sale:{businessId,status:SaleStatus.COMPLETED,saleDate:{gte:py.start,lte:py.end}}},_sum:{lineProfit:true,quantity:true}}),
    prisma.expense.aggregate({where:{businessId,cancelledAt:null,date:{gte:ty.start,lte:ty.end}},_sum:{amount:true}}),
    prisma.expense.aggregate({where:{businessId,cancelledAt:null,date:{gte:py.start,lte:py.end}},_sum:{amount:true}}),
    prisma.customer.count({where:{businessId,createdAt:{gte:ty.start,lte:ty.end}}}),
    prisma.customer.count({where:{businessId,createdAt:{gte:py.start,lte:py.end}}}),
  ]);
  const cur={year:now.getFullYear(),revenue:Number(cS._sum.total||0),grossProfit:Number(cI._sum.lineProfit||0),expenses:Number(cE._sum.amount||0),netProfit:Number(cI._sum.lineProfit||0)-Number(cE._sum.amount||0),orders:cS._count.id,productsSold:Number(cI._sum.quantity||0),newCustomers:cC};
  const prv={year:now.getFullYear()-1,revenue:Number(pS._sum.total||0),grossProfit:Number(pI._sum.lineProfit||0),expenses:Number(pE._sum.amount||0),netProfit:Number(pI._sum.lineProfit||0)-Number(pE._sum.amount||0),orders:pS._count.id,productsSold:Number(pI._sum.quantity||0),newCustomers:pC};
  return {current:cur,previous:prv,growth:{revenue:calculateGrowth(cur.revenue,prv.revenue),grossProfit:calculateGrowth(cur.grossProfit,prv.grossProfit),expenses:calculateGrowth(cur.expenses,prv.expenses),netProfit:calculateGrowth(cur.netProfit,prv.netProfit),orders:calculateGrowth(cur.orders,prv.orders),productsSold:calculateGrowth(cur.productsSold,prv.productsSold),newCustomers:calculateGrowth(cur.newCustomers,prv.newCustomers)}};
}

export async function getTopProducts(businessId: string, startDate: Date, endDate: Date, limit=10, sortBy: 'units'|'revenue'|'profit'='units', branchId?: string): Promise<TopProduct[]> {
  const of=sortBy==='revenue'?'lineTotal':sortBy==='profit'?'lineProfit':'quantity';
  const grouped=await prisma.saleItem.groupBy({
    by:['productId'],
    where:{sale:{businessId,status:SaleStatus.COMPLETED,saleDate:{gte:startDate,lte:endDate},...(branchId?{branchId}:{})}},
    _sum:{quantity:true,lineTotal:true,lineProfit:true},
    orderBy:{_sum:{[of]:'desc'}},take:limit,
  });
  if(!grouped.length) return [];
  const pids=grouped.map(g=>g.productId);
  const prods=await prisma.product.findMany({where:{id:{in:pids}},select:{id:true,name:true,sku:true,unit:true,currentStock:true}});
  const pm=new Map(prods.map(p=>[p.id,p]));
  return grouped.filter(g=>pm.has(g.productId)).map(g=>{
    const p=pm.get(g.productId)!; const rev=Number(g._sum.lineTotal||0); const prof=Number(g._sum.lineProfit||0);
    return {productId:p.id,name:p.name,sku:p.sku,unit:p.unit,currentStock:p.currentStock,quantitySold:Number(g._sum.quantity||0),revenue:rev,profit:prof,profitMarginPercent:rev>0?Math.round(prof/rev*1000)/10:0};
  });
}

export async function getSlowMovingProducts(businessId: string, daysThreshold=30, limit=20): Promise<SlowProduct[]> {
  const now=new Date(); const td=new Date(now); td.setDate(td.getDate()-daysThreshold);
  const minAge=new Date(now); minAge.setDate(minAge.getDate()-14);
  const prods=await prisma.product.findMany({where:{businessId,isActive:true,currentStock:{gt:0},createdAt:{lte:minAge}},select:{id:true,name:true,sku:true,unit:true,currentStock:true,purchasePrice:true,createdAt:true}});
  if(!prods.length) return [];
  const lastSales=await prisma.saleItem.findMany({
    where:{productId:{in:prods.map(p=>p.id)},sale:{businessId,status:SaleStatus.COMPLETED}},
    select:{productId:true,sale:{select:{saleDate:true}}},
    orderBy:{sale:{saleDate:'desc'}},distinct:['productId'],
  });
  const lsMap=new Map<string,Date>();
  for(const i of lastSales) lsMap.set(i.productId,i.sale.saleDate);
  const result: SlowProduct[]=[];
  for(const p of prods){
    const ls=lsMap.get(p.id)??null;
    if(!ls||ls<td){
      const days=ls?Math.floor((now.getTime()-ls.getTime())/86400000):Math.floor((now.getTime()-p.createdAt.getTime())/86400000);
      result.push({productId:p.id,name:p.name,sku:p.sku,unit:p.unit,currentStock:p.currentStock,purchasePrice:Number(p.purchasePrice),stockValue:Number(p.purchasePrice)*p.currentStock,lastSaleDate:ls,daysSinceLastSale:days});
    }
  }
  return result.sort((a,b)=>b.daysSinceLastSale-a.daysSinceLastSale).slice(0,limit);
}

export async function getDeadStock(businessId: string, daysThreshold=90, limit=20) {
  const slow=await getSlowMovingProducts(businessId,daysThreshold,limit*2);
  return slow.filter(p=>p.daysSinceLastSale>=daysThreshold).slice(0,limit).map(p=>({...p,inventoryValue:p.stockValue}));
}

export async function getLowStockSummary(businessId: string) {
  const s=await prisma.businessSetting.findUnique({where:{businessId},select:{lowStockThresholdDefault:true,criticalStockThreshold:true}});
  const lt=s?.lowStockThresholdDefault??5; const ct=s?.criticalStockThreshold??2;
  const prods=await prisma.product.findMany({where:{businessId,isActive:true},select:{currentStock:true,minStockThreshold:true}});
  let outOfStock=0,critical=0,low=0,healthy=0;
  for(const p of prods){
    const th=p.minStockThreshold??lt;
    if(p.currentStock<=0) outOfStock++;
    else if(p.currentStock<=ct) critical++;
    else if(p.currentStock<=th) low++;
    else healthy++;
  }
  return {outOfStock,critical,low,healthy,total:prods.length};
}

export async function getTopCustomers(businessId: string, limit=10, startDate?: Date, endDate?: Date): Promise<TopCustomer[]> {
  const df=startDate&&endDate?{gte:startDate,lte:endDate}:undefined;
  const grouped=await prisma.sale.groupBy({
    by:['customerId'],
    where:{businessId,status:SaleStatus.COMPLETED,customerId:{not:null},...(df?{saleDate:df}:{})},
    _sum:{total:true},_count:{id:true},_max:{saleDate:true},
    orderBy:{_sum:{total:'desc'}},take:limit,
  });
  if(!grouped.length) return [];
  const cids=grouped.map(g=>g.customerId!);
  const custs=await prisma.customer.findMany({where:{id:{in:cids}},select:{id:true,name:true,phone:true,outstanding:true}});
  const cm=new Map(custs.map(c=>[c.id,c]));
  return grouped.filter(g=>g.customerId&&cm.has(g.customerId)).map(g=>{
    const c=cm.get(g.customerId!)!;
    return {customerId:c.id,name:c.name,phone:c.phone,totalSpent:Number(g._sum.total||0),orderCount:g._count.id,outstanding:Number(c.outstanding),lastPurchaseDate:g._max.saleDate??null};
  });
}

export async function getCustomerGrowth(businessId: string, timezone: string) {
  const now=new Date();
  const tm=getMonthlyRange(now.getFullYear(),now.getMonth()+1);
  const pn=now.getMonth()===0?12:now.getMonth(); const py=now.getMonth()===0?now.getFullYear()-1:now.getFullYear();
  const pm=getMonthlyRange(py,pn);
  const [nt,np,ta]=await Promise.all([
    prisma.customer.count({where:{businessId,createdAt:{gte:tm.start,lte:tm.end}}}),
    prisma.customer.count({where:{businessId,createdAt:{gte:pm.start,lte:pm.end}}}),
    prisma.customer.count({where:{businessId,isActive:true}}),
  ]);
  return {newThisMonth:nt,newLastMonth:np,growth:calculateGrowth(nt,np),totalActive:ta};
}

export async function getUdhaarAnalytics(businessId: string, period: AnalyticsPeriod, timezone: string) {
  const [custAgg,pSales,payments,topD]=await Promise.all([
    prisma.customer.aggregate({where:{businessId,isActive:true},_sum:{outstanding:true}}),
    prisma.sale.findMany({where:{businessId,status:SaleStatus.COMPLETED,saleDate:{gte:period.start,lte:period.end}},select:{total:true,paidAmount:true}}),
    prisma.customerPayment.aggregate({where:{businessId,date:{gte:period.start,lte:period.end}},_sum:{amount:true}}),
    prisma.customer.findMany({where:{businessId,isActive:true,outstanding:{gt:0}},orderBy:{outstanding:'desc'},take:5,select:{id:true,name:true,outstanding:true,phone:true}}),
  ]);
  const newCredit=pSales.reduce((sum,s)=>sum+Math.max(0,Number(s.total)-Number(s.paidAmount)),0);
  const paymentsRec=Number(payments._sum.amount||0);
  return {totalOutstanding:Number(custAgg._sum.outstanding||0),newCreditThisPeriod:newCredit,paymentsReceivedThisPeriod:paymentsRec,netChange:newCredit-paymentsRec,topDebtors:topD.map(c=>({customerId:c.id,name:c.name,phone:c.phone,outstanding:Number(c.outstanding)}))};
}

export async function getPurchaseAnalytics(businessId: string, period: AnalyticsPeriod, comparisonPeriod: AnalyticsPeriod) {
  const [cP,pP,sr]=await Promise.all([
    prisma.purchase.aggregate({where:{businessId,status:PurchaseStatus.RECEIVED,purchaseDate:{gte:period.start,lte:period.end}},_sum:{total:true},_count:{id:true}}),
    prisma.purchase.aggregate({where:{businessId,status:PurchaseStatus.RECEIVED,purchaseDate:{gte:comparisonPeriod.start,lte:comparisonPeriod.end}},_sum:{total:true},_count:{id:true}}),
    prisma.purchase.groupBy({by:['supplierId'],where:{businessId,status:PurchaseStatus.RECEIVED,purchaseDate:{gte:period.start,lte:period.end},supplierId:{not:null}},_sum:{total:true},_count:{id:true},_max:{purchaseDate:true},orderBy:{_sum:{total:'desc'}},take:10}),
  ]);
  let topSuppliers: {supplierId:string;name:string;totalSpend:number;purchaseCount:number;lastPurchaseDate:Date|null}[]=[];
  if(sr.length){
    const sids=sr.map(s=>s.supplierId!);
    const recs=await prisma.supplier.findMany({where:{id:{in:sids}},select:{id:true,name:true}});
    const sm=new Map(recs.map(s=>[s.id,s]));
    topSuppliers=sr.filter(s=>s.supplierId&&sm.has(s.supplierId)).map(s=>({supplierId:s.supplierId!,name:sm.get(s.supplierId!)!.name,totalSpend:Number(s._sum.total||0),purchaseCount:s._count.id,lastPurchaseDate:s._max.purchaseDate??null}));
  }
  return {totalSpend:kpi(Number(cP._sum.total||0),Number(pP._sum.total||0)),orderCount:kpi(cP._count.id,pP._count.id),topSuppliers};
}

export async function getBranchAnalytics(businessId: string, startDate: Date, endDate: Date): Promise<BranchStat[]> {
  const branches=await prisma.branch.findMany({where:{businessId},select:{id:true,name:true,code:true},orderBy:{name:'asc'}});
  return Promise.all(branches.map(async b=>{
    const [sA,iA,eA]=await Promise.all([
      prisma.sale.aggregate({where:{businessId,branchId:b.id,status:SaleStatus.COMPLETED,saleDate:{gte:startDate,lte:endDate}},_sum:{total:true},_count:{id:true}}),
      prisma.saleItem.aggregate({where:{sale:{businessId,branchId:b.id,status:SaleStatus.COMPLETED,saleDate:{gte:startDate,lte:endDate}}},_sum:{lineProfit:true}}),
      prisma.expense.aggregate({where:{businessId,branchId:b.id,cancelledAt:null,date:{gte:startDate,lte:endDate}},_sum:{amount:true}}),
    ]);
    const rev=Number(sA._sum.total||0); const gp=Number(iA._sum.lineProfit||0); const exp=Number(eA._sum.amount||0);
    return {branchId:b.id,branchName:b.name,branchCode:b.code,revenue:rev,grossProfit:gp,expenses:exp,netProfit:gp-exp,orderCount:sA._count.id};
  }));
}

export async function getInventoryValuation(businessId: string) {
  const s=await prisma.businessSetting.findUnique({where:{businessId},select:{lowStockThresholdDefault:true,criticalStockThreshold:true}});
  const lt=s?.lowStockThresholdDefault??5; const ct=s?.criticalStockThreshold??2;
  const prods=await prisma.product.findMany({where:{businessId,isActive:true},select:{currentStock:true,purchasePrice:true,minStockThreshold:true}});
  let totalUnits=0,totalValue=0,lowStockValue=0;
  for(const p of prods){
    if(p.currentStock<=0) continue;
    const v=p.currentStock*Number(p.purchasePrice); totalUnits+=p.currentStock; totalValue+=v;
    const th=p.minStockThreshold??lt;
    if(p.currentStock>ct&&p.currentStock<=th) lowStockValue+=v;
  }
  const dead=await getDeadStock(businessId,90,100);
  const deadStockValue=dead.reduce((s,p)=>s+p.inventoryValue,0);
  return {totalUnits,totalValue,lowStockValue,deadStockValue,valuationMethod:'LATEST_COST' as const,note:'Valued at latest purchase price per unit.'};
}

export async function getDecliningProducts(businessId: string, currentPeriod: AnalyticsPeriod, previousPeriod: AnalyticsPeriod, thresholdPercent: number = 15, limit: number = 20): Promise<DecliningProduct[]> {
  const [curGrouped, prevGrouped] = await Promise.all([
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: currentPeriod.start, lte: currentPeriod.end } } },
      _sum: { lineTotal: true },
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: previousPeriod.start, lte: previousPeriod.end } } },
      _sum: { lineTotal: true },
    }),
  ]);
  const curMap = new Map(curGrouped.map(g => [g.productId, Number(g._sum.lineTotal || 0)]));
  const prevMap = new Map(prevGrouped.map(g => [g.productId, Number(g._sum.lineTotal || 0)]));
  const allProductIds = new Set([...curMap.keys(), ...prevMap.keys()]);
  if (!allProductIds.size) return [];
  const products = await prisma.product.findMany({ where: { id: { in: Array.from(allProductIds) }, businessId }, select: { id: true, name: true, sku: true, unit: true, currentStock: true } });
  const pm = new Map(products.map(p => [p.id, p]));
  const result: DecliningProduct[] = [];
  for (const pid of allProductIds) {
    const p = pm.get(pid);
    if (!p) continue;
    const prev = prevMap.get(pid) || 0;
    const cur = curMap.get(pid) || 0;
    if (prev <= 0 && cur <= 0) continue;
    const declineAmount = prev - cur;
    const declinePercent = prev > 0 ? Math.round((declineAmount / prev) * 1000) / 10 : null;
    if (declinePercent !== null && declinePercent >= thresholdPercent) {
      result.push({ productId: p.id, name: p.name, sku: p.sku, unit: p.unit, currentStock: p.currentStock, previousRevenue: prev, currentRevenue: cur, declinePercent, declineAmount });
    }
  }
  return result.sort((a, b) => (b.declinePercent ?? 0) - (a.declinePercent ?? 0)).slice(0, limit);
}

export async function getBestProfitProducts(businessId: string, startDate: Date, endDate: Date, limit: number = 10, branchId?: string): Promise<BestProfitProduct[]> {
  const grouped = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: startDate, lte: endDate }, ...(branchId ? { branchId } : {}) } },
    _sum: { lineTotal: true, lineProfit: true },
    orderBy: { _sum: { lineProfit: 'desc' } },
    take: limit,
  });
  if (!grouped.length) return [];
  const pids = grouped.map(g => g.productId);
  const prods = await prisma.product.findMany({ where: { id: { in: pids } }, select: { id: true, name: true, sku: true, unit: true, currentStock: true } });
  const pm = new Map(prods.map(p => [p.id, p]));
  return grouped.filter(g => pm.has(g.productId)).map(g => {
    const p = pm.get(g.productId)!;
    const rev = Number(g._sum.lineTotal || 0);
    const prof = Number(g._sum.lineProfit || 0);
    return { productId: p.id, name: p.name, sku: p.sku, unit: p.unit, currentStock: p.currentStock, revenue: rev, profit: prof, profitMarginPercent: rev > 0 ? Math.round(prof / rev * 1000) / 10 : 0 };
  });
}

export async function getExpenseAnalytics(businessId: string, period: AnalyticsPeriod, comparisonPeriod: AnalyticsPeriod, branchId?: string) {
  const bf = branchId ? { branchId } : {};
  const [curExpenses, prevExpenses, curAgg] = await Promise.all([
    prisma.expense.findMany({ where: { businessId, cancelledAt: null, date: { gte: period.start, lte: period.end }, ...bf }, select: { category: true, amount: true, date: true } }),
    prisma.expense.findMany({ where: { businessId, cancelledAt: null, date: { gte: comparisonPeriod.start, lte: comparisonPeriod.end }, ...bf }, select: { category: true, amount: true } }),
    prisma.expense.aggregate({ where: { businessId, cancelledAt: null, date: { gte: period.start, lte: period.end }, ...bf }, _sum: { amount: true } }),
  ]);
  const totalCurrent = Number(curAgg._sum.amount || 0);
  const categoryMap = new Map<string, number>();
  for (const e of curExpenses) {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + Number(e.amount));
  }
  const categories: ExpenseCategoryStat[] = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount, percentage: totalCurrent > 0 ? Math.round((amount / totalCurrent) * 1000) / 10 : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const prevTotal = prevExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalGrowth = calculateGrowth(totalCurrent, prevTotal);
  return { totalCurrent, totalPrevious: prevTotal, totalGrowth, categories, expenseCount: curExpenses.length };
}

export async function getEmployeePayrollAnalytics(businessId: string, period: AnalyticsPeriod) {
  const [payrollAgg, salaryAgg, empCount, attendanceCount, leaveAgg] = await Promise.all([
    prisma.employeeSalary.aggregate({
      where: { businessId, paymentDate: { gte: period.start, lte: period.end } },
      _sum: { netSalary: true },
    }),
    prisma.employeeSalary.aggregate({
      where: { businessId, paymentStatus: 'PENDING' },
      _sum: { netSalary: true },
    }),
    prisma.employee.count({ where: { businessId, status: 'ACTIVE' } }),
    prisma.employeeAttendance.count({
      where: { businessId, date: { gte: period.start, lte: period.end } },
    }),
    prisma.employeeLeave.count({
      where: { businessId, startDate: { lte: period.end }, endDate: { gte: period.start }, status: 'APPROVED' },
    }),
  ]);
  const totalPaid = Number(payrollAgg._sum.netSalary || 0);
  const pending = Number(salaryAgg._sum.netSalary || 0);
  const attendancePct = empCount > 0 && attendanceCount > 0 ? Math.round((attendanceCount / (empCount * 30)) * 1000) / 10 : null;
  return { totalPayroll: totalPaid + pending, paidPayroll: totalPaid, pendingPayroll: pending, employeeCount: empCount, attendancePercentage: attendancePct, leaveUsage: leaveAgg };
}

export async function getSalesByPaymentMethod(businessId: string, startDate: Date, endDate: Date, branchId?: string): Promise<SalesByPaymentMethod[]> {
  const sales = await prisma.sale.findMany({
    where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: startDate, lte: endDate }, ...(branchId ? { branchId } : {}) },
    select: { paymentMethod: true, total: true },
  });
  const map = new Map<string, { count: number; revenue: number }>();
  for (const s of sales) {
    const existing = map.get(s.paymentMethod) || { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += Number(s.total);
    map.set(s.paymentMethod, existing);
  }
  const total = sales.reduce((s, sl) => s + Number(sl.total), 0);
  return Array.from(map.entries())
    .map(([method, data]) => ({ method, count: data.count, revenue: data.revenue, percentage: total > 0 ? Math.round((data.revenue / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getSalesByCategory(businessId: string, startDate: Date, endDate: Date, branchId?: string): Promise<SalesByCategory[]> {
  const items = await prisma.saleItem.findMany({
    where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: startDate, lte: endDate }, ...(branchId ? { branchId } : {}) } },
    include: { product: { select: { categoryId: true, category: { select: { id: true, name: true } } } } },
  });
  const catMap = new Map<string, { name: string; revenue: number; profit: number; orders: number }>();
  for (const item of items) {
    const cid = item.product.categoryId || 'uncategorized';
    const existing = catMap.get(cid) || { name: item.product.category?.name || 'Uncategorized', revenue: 0, profit: 0, orders: 0 };
    existing.revenue += Number(item.lineTotal);
    existing.profit += Number(item.lineProfit);
    existing.orders += 1;
    catMap.set(cid, existing);
  }
  const totalRevenue = Array.from(catMap.values()).reduce((s, c) => s + c.revenue, 0);
  return Array.from(catMap.entries())
    .map(([categoryId, data]) => ({ categoryId, categoryName: data.name, revenue: data.revenue, profit: data.profit, orders: data.orders, percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 1000) / 10 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}
