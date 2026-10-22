import React, { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const getCardTypeForMember = (memberId) => {
  if (!memberId) return 'Silver';
  let sum = 0;
  for (let i = 0; i < memberId.length; i++) {
    sum += memberId.charCodeAt(i);
  }
  const tiers = ['Silver', 'Gold', 'Diamond'];
  return tiers[sum % tiers.length];
};

const DashboardAnalyticsCharts = memo(({
  analytics,
  ordersTrendData,
  topSellingData,
  membershipGrowthData,
  revenueByCardTierData,
  currentBizRecords = [],
  catalog = [],
  customers = [],
  isJobBiz = false,
  isTravelBiz = false,
  isStayBiz = false,
  isServicesBiz = false,
  terms = { catalogName: 'Items' }
}) => {
  // Memoized Orders Trend (last 7 days)
  const computedOrdersTrend = useMemo(() => {
    if (ordersTrendData && ordersTrendData.length > 0) return ordersTrendData;
    const map = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      map[key] = 0;
    }
    currentBizRecords.forEach(o => {
      const dateVal = o.appointmentDate || o.checkInDate || o.travelDate || o.createdAt || o.created_at || o.orderDate;
      if (!dateVal) return;
      const key = new Date(dateVal).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (map[key] !== undefined) {
        map[key] += 1;
      }
    });
    return Object.keys(map).map(date => ({ date, count: map[date] }));
  }, [ordersTrendData, currentBizRecords]);

  // Memoized Top Selling items (max 5)
  const computedTopSelling = useMemo(() => {
    if (topSellingData && topSellingData.length > 0) return topSellingData;
    if (isJobBiz) {
      const jobAppMap = {};
      currentBizRecords.forEach(o => {
        if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
          const catMatch = catalog.find(c => 
            (o.jobId && String(c._id) === String(o.jobId)) ||
            (o.job_id && String(c._id) === String(o.job_id)) ||
            (o.productId && String(c._id) === String(o.productId)) ||
            (o.jobTitle && c.title && c.title.toLowerCase() === o.jobTitle.toLowerCase()) ||
            (o.jobTitle && c.name && c.name.toLowerCase() === o.jobTitle.toLowerCase()) ||
            (o.title && c.title && c.title.toLowerCase() === o.title.toLowerCase())
          );
          const title = catMatch?.title || catMatch?.name || o.jobTitle || o.title || o.position || 'Job Posting';
          jobAppMap[title] = (jobAppMap[title] || 0) + 1;
        }
      });
      return Object.keys(jobAppMap)
        .map(name => ({ name, sales: jobAppMap[name] }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
    }

    if (isTravelBiz) {
      const travelMap = {};
      currentBizRecords.forEach(o => {
        if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
          const catMatch = catalog.find(c => 
            (o.productId && String(c._id) === String(o.productId)) ||
            (o.product_details && c.name && c.name.toLowerCase() === o.product_details.toLowerCase()) ||
            (o.vehicleType && c.category && c.category.toLowerCase() === o.vehicleType.toLowerCase())
          );
          let routeOpt = catMatch?.category || catMatch?.name || o.vehicleType || o.product_details || 'Travel Route';
          if (/car/i.test(routeOpt)) routeOpt = 'Car';
          else if (/bus/i.test(routeOpt)) routeOpt = 'Bus';
          else if (/bike/i.test(routeOpt)) routeOpt = 'Bike';
          travelMap[routeOpt] = (travelMap[routeOpt] || 0) + 1;
        }
      });
      return Object.keys(travelMap)
        .map(name => ({ name, sales: travelMap[name] }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
    }

    const itemMap = {};
    currentBizRecords.forEach(o => {
      if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
        const itemList = (o.items && Array.isArray(o.items) && o.items.length > 0) ? o.items : [];
        if (itemList.length > 0) {
          itemList.forEach(item => {
            const catMatch = catalog.find(c => 
              (item.productId && String(c._id) === String(item.productId)) ||
              (item.id && String(c._id) === String(item.id)) ||
              (item.name && c.name && c.name.toLowerCase() === item.name.toLowerCase())
            );
            const name = catMatch ? catMatch.name : (item.name || o.serviceName || (o.doctorName ? `Dr. ${o.doctorName}` : null) || o.product_details || o.itemName || 'Item');
            if (name && name !== 'Unknown Item') {
              itemMap[name] = (itemMap[name] || 0) + (Number(item.quantity) || 1);
            }
          });
        } else {
          const singleName = o.serviceName ||
            (o.doctorName ? `Dr. ${o.doctorName}` : null) ||
            (o.roomNumber ? `Room ${o.roomNumber}` : null) ||
            o.product_details ||
            o.itemName ||
            o.name ||
            o.title;

          const catMatch = catalog.find(c => 
            (o.productId && String(c._id) === String(o.productId)) ||
            (singleName && c.name && c.name.toLowerCase() === singleName.toLowerCase())
          );
          const resolvedName = catMatch ? catMatch.name : (singleName || (isServicesBiz ? 'General Service' : isStayBiz ? 'Room Booking' : 'Order Item'));
          if (resolvedName) {
            itemMap[resolvedName] = (itemMap[resolvedName] || 0) + 1;
          }
        }
      }
    });
    return Object.keys(itemMap)
      .map(name => ({ name, sales: itemMap[name] }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [topSellingData, currentBizRecords, catalog, isJobBiz, isTravelBiz, isServicesBiz, isStayBiz]);

  // Memoized Membership Growth (cumulative)
  const computedMembershipGrowth = useMemo(() => {
    if (membershipGrowthData && membershipGrowthData.length > 0) return membershipGrowthData;
    const map = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      map[key] = 0;
    }
    customers.forEach(c => {
      const key = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (map[key] !== undefined) {
        map[key] += 1;
      }
    });
    let cumulative = Math.max(0, customers.length - Object.values(map).reduce((sum, v) => sum + v, 0));
    return Object.keys(map).map(date => {
      cumulative += map[date];
      return { date, members: cumulative };
    });
  }, [membershipGrowthData, customers]);

  // Memoized Revenue by Card Tier
  const computedRevenueByCardTier = useMemo(() => {
    if (revenueByCardTierData && revenueByCardTierData.length > 0) return revenueByCardTierData;
    const map = { Silver: 0, Gold: 0, Diamond: 0 };
    currentBizRecords.forEach(o => {
      if (o.status !== 'Cancelled') {
        const tier = getCardTypeForMember(o.memberId);
        map[tier] += o.finalAmount || 0;
      }
    });
    return Object.keys(map).map(tier => ({ name: tier, revenue: map[tier] }));
  }, [revenueByCardTierData, currentBizRecords]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Charts Row 1: Revenue & Orders trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Revenue Trend Line Chart */}
        <div className="bg-white dark:bg-slate-900/80 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Revenue Trend</h3>
          {analytics?.recentRevenue?.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No completed transactions to graph</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.recentRevenue || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={500} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={500} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                    formatter={(value) => [`₹${value}`, 'Amount']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Orders Trend Chart */}
        <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Orders Trend</h3>
          {computedOrdersTrend.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No orders recorded</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={computedOrdersTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={500} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={500} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                    formatter={(value) => [`${value}`, 'Count']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Top Selling & Membership Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Dishes/Products */}
        <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Top {isJobBiz ? 'Applied' : 'Selling'} {terms.catalogName}</h3>
          {computedTopSelling.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">{isJobBiz ? 'No job applications to graph' : 'No sales details to graph'}</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={computedTopSelling}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={500} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={500} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                    formatter={(value) => [`${value}`, isJobBiz ? 'Applications' : (isTravelBiz || isStayBiz || isServicesBiz) ? 'Bookings' : 'Units Sold']}
                  />
                  <Bar dataKey="sales" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Membership Growth Chart */}
        <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Membership Growth</h3>
          {computedMembershipGrowth.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No memberships to graph</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={computedMembershipGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={500} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={500} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                    formatter={(value) => [`${value}`, 'Active Members']}
                  />
                  <Line type="monotone" dataKey="members" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 3: Revenue by Card Tier */}
      <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Revenue by Card Tier</h3>
        {computedRevenueByCardTier.every(d => d.revenue === 0) ? (
          <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No membership tier revenue recorded yet</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={computedRevenueByCardTier}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={500} />
                <YAxis stroke="#64748b" fontSize={11} fontWeight={500} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', borderRadius: '16px', backdropFilter: 'blur(10px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} 
                  labelStyle={{ color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}
                  itemStyle={{ color: '#ffffff', fontWeight: 600 }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[10, 10, 0, 0]}>
                  {computedRevenueByCardTier.map((entry, index) => {
                    const colors = ['#94a3b8', '#fbbf24', '#38bdf8']; // Silver, Gold, Diamond
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
});

DashboardAnalyticsCharts.displayName = 'DashboardAnalyticsCharts';

export default DashboardAnalyticsCharts;
