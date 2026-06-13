'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  SlidersHorizontal, 
  Coffee, 
  Utensils, 
  Moon, 
  CheckCircle, 
  RefreshCw, 
  Phone,
  User as UserIcon,
  CircleAlert,
  Loader2,
  LogOut,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Order {
  _id: string;
  employeeName: string;
  employeeNo: string;
  phoneNumber: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  mealOption?: 'VEGETARIAN' | 'MEAT';
  status: 'ORDERED' | 'COLLECTED';
  requestedAt: string;
  collectedAt?: string;
  requestDate: string;
  notes?: string;
}

export default function CanteenDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealFilter, setSelectedMealFilter] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');
  const [selectedPreferenceFilter, setSelectedPreferenceFilter] = useState<'ALL' | 'VEGETARIAN' | 'MEAT'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ORDERED' | 'COLLECTED'>('ORDERED'); // Default to Pending (ORDERED)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders?requestDate=${selectedDate}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load orders');
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not fetch orders',
      });
    } finally {
      setLoading(false);
    }
  }, [router, toast, selectedDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleMarkAsCollected = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      toast({
        title: 'Collected',
        description: 'Order successfully marked as collected.',
      });

      // Update the order in local state
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'COLLECTED', collectedAt: new Date().toISOString() } : o));
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleBulkMarkAsCollected = async () => {
    if (selectedOrderIds.length === 0) return;
    setUpdatingOrderId('BULK');
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedOrderIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update orders');

      toast({
        title: 'Bulk Collections Successful',
        description: `Successfully marked ${data.modifiedCount || selectedOrderIds.length} orders as collected.`,
      });

      // Update state locally
      const now = new Date().toISOString();
      setOrders(prev => prev.map(o => 
        selectedOrderIds.includes(o._id) 
          ? { ...o, status: 'COLLECTED', collectedAt: now } 
          : o
      ));
      setSelectedOrderIds([]);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Bulk Update Failed',
        description: err.message || 'Something went wrong',
      });
    }
  };

  const handleCollectAllListed = async () => {
    const pendingFiltered = filteredOrders.filter(o => o.status === 'ORDERED');
    if (pendingFiltered.length === 0) return;
    
    const pendingIds = pendingFiltered.map(o => o._id);
    setUpdatingOrderId('BULK');
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: pendingIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update orders');

      toast({
        title: 'Bulk Collections Successful',
        description: `Successfully marked all ${data.modifiedCount || pendingIds.length} listed pending orders as collected.`,
      });

      const now = new Date().toISOString();
      setOrders(prev => prev.map(o => 
        pendingIds.includes(o._id) 
          ? { ...o, status: 'COLLECTED', collectedAt: now } 
          : o
      ));
      setSelectedOrderIds([]);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Bulk Update Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const isMealDeadlinePassed = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER', targetDate: string) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    
    if (targetDate < todayStr) {
      return true;
    }
    
    if (targetDate > todayStr) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
      
      if (targetDate === tomorrowStr && mealType === 'BREAKFAST') {
        return now.getHours() >= 20; // 8:00 PM today
      }
      return false;
    }
    
    // Today
    const currentHour = now.getHours();
    if (mealType === 'BREAKFAST') {
      return true; // Today's breakfast locks yesterday at 8 PM, so it's passed
    } else if (mealType === 'LUNCH') {
      return currentHour >= 9; // 9:00 AM
    } else if (mealType === 'DINNER') {
      return currentHour >= 17; // 5:00 PM
    }
    return false;
  };

  const handleDownloadPDF = () => {
    const targetFormattedDate = format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM dd, yyyy');
    
    // Group orders
    const breakfasts = orders.filter(o => o.mealType === 'BREAKFAST');
    const lunches = orders.filter(o => o.mealType === 'LUNCH');
    const dinners = orders.filter(o => o.mealType === 'DINNER');

    const isBreakfastPassed = isMealDeadlinePassed('BREAKFAST', selectedDate);
    const isLunchPassed = isMealDeadlinePassed('LUNCH', selectedDate);
    const isDinnerPassed = isMealDeadlinePassed('DINNER', selectedDate);

    if (selectedMealFilter === 'BREAKFAST' && !isBreakfastPassed) {
      toast({
        variant: 'destructive',
        title: 'Report Unavailable',
        description: 'Breakfast booking is still open. You can download the report after 8:00 PM today.',
      });
      return;
    }
    if (selectedMealFilter === 'LUNCH' && !isLunchPassed) {
      toast({
        variant: 'destructive',
        title: 'Report Unavailable',
        description: 'Lunch booking is still open. You can download the report after 9:00 AM today.',
      });
      return;
    }
    if (selectedMealFilter === 'DINNER' && !isDinnerPassed) {
      toast({
        variant: 'destructive',
        title: 'Report Unavailable',
        description: 'Dinner booking is still open. You can download the report after 5:00 PM today.',
      });
      return;
    }

    if (selectedMealFilter === 'ALL' && !isBreakfastPassed && !isLunchPassed && !isDinnerPassed) {
      toast({
        variant: 'destructive',
        title: 'No Completed Reports',
        description: 'All bookings for this date are still open. Report is not ready.',
      });
      return;
    }

    const renderBreakfast = selectedMealFilter === 'ALL' ? isBreakfastPassed : selectedMealFilter === 'BREAKFAST';
    const renderLunch = selectedMealFilter === 'ALL' ? isLunchPassed : selectedMealFilter === 'LUNCH';
    const renderDinner = selectedMealFilter === 'ALL' ? isDinnerPassed : selectedMealFilter === 'DINNER';

    if (selectedMealFilter === 'ALL' && (!isBreakfastPassed || !isLunchPassed || !isDinnerPassed)) {
      const skipped = [];
      if (!isBreakfastPassed) skipped.push('Breakfast');
      if (!isLunchPassed) skipped.push('Lunch');
      if (!isDinnerPassed) skipped.push('Dinner');
      toast({
        title: 'Report Generated',
        description: `PDF generated for completed meals. Open meals excluded: ${skipped.join(', ')}.`,
      });
    }
    
    let summaryRows = '';
    if (renderBreakfast) {
      summaryRows += `
        <tr>
          <td><strong>Breakfast</strong></td>
          <td>${breakfasts.filter(o => o.mealOption === 'VEGETARIAN').length}</td>
          <td>${breakfasts.filter(o => o.mealOption === 'MEAT').length}</td>
          <td><strong>${breakfasts.length}</strong></td>
        </tr>
      `;
    }
    if (renderLunch) {
      summaryRows += `
        <tr>
          <td><strong>Lunch</strong></td>
          <td>${lunches.filter(o => o.mealOption === 'VEGETARIAN').length}</td>
          <td>${lunches.filter(o => o.mealOption === 'MEAT').length}</td>
          <td><strong>${lunches.length}</strong></td>
        </tr>
      `;
    }
    if (renderDinner) {
      summaryRows += `
        <tr>
          <td><strong>Dinner</strong></td>
          <td>${dinners.filter(o => o.mealOption === 'VEGETARIAN').length}</td>
          <td>${dinners.filter(o => o.mealOption === 'MEAT').length}</td>
          <td><strong>${dinners.length}</strong></td>
        </tr>
      `;
    }
    
    const htmlContent = `
      <html>
        <head>
          <title>Meal Logistics Daily Report - ${selectedDate}</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              color: #333;
              padding: 20px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 12px;
              color: #666;
              font-weight: bold;
            }
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .summary-table th, .summary-table td {
              border: 1px solid #ddd;
              padding: 8px 12px;
              text-align: left;
              font-size: 11px;
            }
            .summary-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .meal-section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .meal-title {
              font-size: 14px;
              font-weight: bold;
              border-bottom: 1.5px solid #666;
              padding-bottom: 4px;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .order-table {
              width: 100%;
              border-collapse: collapse;
            }
            .order-table th, .order-table td {
              border: 1px solid #eee;
              padding: 7px 10px;
              text-align: left;
              font-size: 10px;
            }
            .order-table th {
              background-color: #fafafa;
              font-weight: bold;
            }
            .veg-pill {
              background-color: #e8f5e9;
              color: #2e7d32;
              font-weight: bold;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
            }
            .meat-pill {
              background-color: #ffebee;
              color: #c62828;
              font-weight: bold;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
            }
            .notes-text {
              font-style: italic;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ZPMC Lanka Meal Logistics</h1>
            <p>Daily Operations Report - ${targetFormattedDate}</p>
          </div>
          
          <h2>Summary</h2>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Meal Time</th>
                <th>Vegetarian</th>
                <th>Meat</th>
                <th>Total Orders</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRows}
            </tbody>
          </table>
          
          ${renderBreakfast ? `
            <!-- Breakfast Section -->
            <div class="meal-section">
              <div class="meal-title">Breakfast Orders (${breakfasts.length})</div>
              ${breakfasts.length === 0 ? '<p style="font-size: 10px; color: #777;">No breakfast orders placed for this date.</p>' : `
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Option</th>
                      <th>Notes / Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${breakfasts.map(o => `
                      <tr>
                        <td>${o.employeeNo}</td>
                        <td><strong>${o.employeeName}</strong></td>
                        <td>${o.phoneNumber}</td>
                        <td><span class="${o.mealOption === 'VEGETARIAN' ? 'veg-pill' : 'meat-pill'}">${o.mealOption === 'VEGETARIAN' ? 'VEG' : 'MEAT'}</span></td>
                        <td class="notes-text">${o.notes || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
            </div>
          ` : ''}

          ${renderLunch ? `
            <!-- Lunch Section -->
            <div class="meal-section">
              <div class="meal-title">Lunch Orders (${lunches.length})</div>
              ${lunches.length === 0 ? '<p style="font-size: 10px; color: #777;">No lunch orders placed for this date.</p>' : `
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Option</th>
                      <th>Notes / Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lunches.map(o => `
                      <tr>
                        <td>${o.employeeNo}</td>
                        <td><strong>${o.employeeName}</strong></td>
                        <td>${o.phoneNumber}</td>
                        <td><span class="${o.mealOption === 'VEGETARIAN' ? 'veg-pill' : 'meat-pill'}">${o.mealOption === 'VEGETARIAN' ? 'VEG' : 'MEAT'}</span></td>
                        <td class="notes-text">${o.notes || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
            </div>
          ` : ''}

          ${renderDinner ? `
            <!-- Dinner Section -->
            <div class="meal-section">
              <div class="meal-title">Dinner Orders (${dinners.length})</div>
              ${dinners.length === 0 ? '<p style="font-size: 10px; color: #777;">No dinner orders placed for this date.</p>' : `
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Option</th>
                      <th>Notes / Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dinners.map(o => `
                      <tr>
                        <td>${o.employeeNo}</td>
                        <td><strong>${o.employeeName}</strong></td>
                        <td>${o.phoneNumber}</td>
                        <td><span class="${o.mealOption === 'VEGETARIAN' ? 'veg-pill' : 'meat-pill'}">${o.mealOption === 'VEGETARIAN' ? 'VEG' : 'MEAT'}</span></td>
                        <td class="notes-text">${o.notes || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
            </div>
          ` : ''}
        </body>
      </html>
    `;
    
    // Create temporary element to render the HTML content
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    document.body.appendChild(element);

    const runHtml2Pdf = () => {
      (window as any).html2pdf().from(element).set({
        margin: 10,
        filename: `Meal_Logistics_Report_${selectedDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: false, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save().then(() => {
        document.body.removeChild(element);
        toast({
          title: 'Report Downloaded',
          description: `Daily operations report for ${selectedDate} has been downloaded.`,
        });
      }).catch((err: any) => {
        console.error('PDF generation error:', err);
        document.body.removeChild(element);
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description: 'Failed to generate and download the PDF report.',
        });
      });
    };

    const loadHtml2Pdf = () => {
      // Check if html2pdf is already loaded dynamically, otherwise load it from CDN
      if ((window as any).html2pdf) {
        runHtml2Pdf();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => {
          runHtml2Pdf();
        };
        script.onerror = () => {
          document.body.removeChild(element);
          toast({
            variant: 'destructive',
            title: 'Download Failed',
            description: 'Failed to load PDF generation library.',
          });
        };
        document.body.appendChild(script);
      }
    };

    // Load html2canvas-pro first to support modern oklch CSS color functions
    if ((window as any).html2canvas) {
      loadHtml2Pdf();
    } else {
      const proScript = document.createElement('script');
      proScript.src = 'https://cdn.jsdelivr.net/npm/html2canvas-pro@latest/dist/html2canvas.min.js';
      proScript.onload = () => {
        loadHtml2Pdf();
      };
      proScript.onerror = () => {
        document.body.removeChild(element);
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description: 'Failed to load modern HTML canvas rendering library.',
        });
      };
      document.body.appendChild(proScript);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAll = (pendingOrders: Order[]) => {
    const pendingIds = pendingOrders.map(o => o._id);
    const allSelected = pendingIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !pendingIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...pendingIds])));
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.employeeNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesMeal = selectedMealFilter === 'ALL' || order.mealType === selectedMealFilter;
    const matchesPreference = selectedPreferenceFilter === 'ALL' || order.mealOption === selectedPreferenceFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || order.status === selectedStatusFilter;

    return matchesSearch && matchesMeal && matchesPreference && matchesStatus;
  });

  // Expected stats counts for today
  const getMealProgress = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    const mealOrders = orders.filter(o => o.mealType === mealType);
    const total = mealOrders.length;
    const collected = mealOrders.filter(o => o.status === 'COLLECTED').length;
    const pct = total > 0 ? Math.round((collected / total) * 100) : 0;
    
    // Veg/Meat stats
    const vegCount = mealOrders.filter(o => o.mealOption === 'VEGETARIAN').length;
    const meatCount = mealOrders.filter(o => o.mealOption === 'MEAT').length;
    
    return { total, collected, pct, vegCount, meatCount };
  };

  const breakfastProgress = getMealProgress('BREAKFAST');
  const lunchProgress = getMealProgress('LUNCH');
  const dinnerProgress = getMealProgress('DINNER');

  const pendingActiveCount = orders.filter(o => o.status === 'ORDERED').length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" className="h-11 object-contain" alt="ZPMC Lanka" />
          <div className="h-6 w-[1px] bg-slate-200" />
          <div>
            <h1 className="text-sm font-bold text-slate-850 tracking-tight leading-none">Canteen Operations</h1>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5 leading-none">Dashboard</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-50 transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto pb-32">
        {/* Date Selector & Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-4">
            <div className="flex-1">
              <label htmlFor="operationDate" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Operation Date
              </label>
              <input 
                id="operationDate"
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedOrderIds([]); }}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-extrabold focus:border-blue-500 focus:bg-white focus-visible:outline-none transition-all cursor-pointer"
              />
            </div>
            <button 
              onClick={fetchOrders}
              className="p-3 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors shrink-0 flex items-center justify-center h-11 w-11 mt-5"
              title="Refresh Orders"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Overview for {format(new Date(selectedDate + 'T00:00:00'), 'MMM dd, yyyy')}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Breakfast Stats Card */}
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Coffee className="h-4.5 w-4.5" />
                </div>
                <span className="text-[9px] font-extrabold text-slate-400 bg-slate-50 px-1 rounded">{breakfastProgress.pct}%</span>
              </div>
              <div className="mt-2.5">
                <p className="text-xl font-bold text-slate-800 leading-tight">{breakfastProgress.total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-none">Breakfast</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${breakfastProgress.pct}%` }} />
                </div>
                <p className="text-[8px] font-extrabold text-slate-400 mt-1.5 leading-none">
                  {breakfastProgress.collected}/{breakfastProgress.total} Coll. • V:{breakfastProgress.vegCount} M:{breakfastProgress.meatCount}
                </p>
              </div>
            </div>

            {/* Lunch Stats Card */}
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-505 flex items-center justify-center">
                  <Utensils className="h-4.5 w-4.5" />
                </div>
                <span className="text-[9px] font-extrabold text-slate-400 bg-slate-50 px-1 rounded">{lunchProgress.pct}%</span>
              </div>
              <div className="mt-2.5">
                <p className="text-xl font-bold text-slate-800 leading-tight">{lunchProgress.total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-none">Lunch</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${lunchProgress.pct}%` }} />
                </div>
                <p className="text-[8px] font-extrabold text-slate-400 mt-1.5 leading-none">
                  {lunchProgress.collected}/{lunchProgress.total} Coll. • V:{lunchProgress.vegCount} M:{lunchProgress.meatCount}
                </p>
              </div>
            </div>

            {/* Dinner Stats Card */}
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                  <Moon className="h-4.5 w-4.5" />
                </div>
                <span className="text-[9px] font-extrabold text-slate-400 bg-slate-50 px-1 rounded">{dinnerProgress.pct}%</span>
              </div>
              <div className="mt-2.5">
                <p className="text-xl font-bold text-slate-800 leading-tight">{dinnerProgress.total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-none">Dinner</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${dinnerProgress.pct}%` }} />
                </div>
                <p className="text-[8px] font-extrabold text-slate-400 mt-1.5 leading-none">
                  {dinnerProgress.collected}/{dinnerProgress.total} Coll. • V:{dinnerProgress.vegCount} M:{dinnerProgress.meatCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List Area */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                Active Meal Requests
                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendingActiveCount} Pending
                </span>
              </h3>
            </div>
            
            <div className="flex gap-2.5">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-extrabold tracking-wide flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
              <button
                onClick={handleCollectAllListed}
                disabled={filteredOrders.filter(o => o.status === 'ORDERED').length === 0 || updatingOrderId === 'BULK'}
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white rounded-xl text-[10px] font-extrabold tracking-wide flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 border border-blue-500/10"
              >
                {updatingOrderId === 'BULK' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 stroke-[2.25]" />
                )}
                Collect All Listed
              </button>
            </div>
          </div>

          {/* Quick Filters Area */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
            {/* Search Input and Toggle */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search Employee ID, Name, or Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus-visible:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`flex-1 h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    viewMode === 'TABLE' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  List Layout
                </button>
                <button
                  onClick={() => setViewMode('CARDS')}
                  className={`flex-1 h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    viewMode === 'CARDS' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Cards Layout
                </button>
              </div>
            </div>

            {/* Quick Segment Controls (ALWAYS Stacked Vertically on Desktop in 480px frame) */}
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
              {/* Meal Filter Tabs */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Meal Time</span>
                <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                  {['ALL', 'BREAKFAST', 'LUNCH', 'DINNER'].map(meal => (
                    <button
                      key={meal}
                      onClick={() => { setSelectedMealFilter(meal as any); setSelectedOrderIds([]); }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${
                        selectedMealFilter === meal 
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {meal === 'ALL' ? 'All' : meal.charAt(0) + meal.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preference Filter Tabs */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Preference</span>
                <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                  {['ALL', 'VEGETARIAN', 'MEAT'].map(pref => (
                    <button
                      key={pref}
                      onClick={() => { setSelectedPreferenceFilter(pref as any); setSelectedOrderIds([]); }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${
                        selectedPreferenceFilter === pref 
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {pref === 'ALL' ? 'All' : pref === 'VEGETARIAN' ? 'Veg' : 'Meat'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Collection Status</span>
                <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                  {['ORDERED', 'COLLECTED', 'ALL'].map(status => (
                    <button
                      key={status}
                      onClick={() => { setSelectedStatusFilter(status as any); setSelectedOrderIds([]); }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${
                        selectedStatusFilter === status 
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {status === 'ORDERED' ? 'Pending' : status === 'COLLECTED' ? 'Collected' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* List/Cards Container */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <p className="text-xs text-slate-400 font-bold">Refreshing list...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <CircleAlert className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-bold">No meal requests found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                  Try adjusting filters or searching a different employee name/ID.
                </p>
              </div>
            ) : viewMode === 'TABLE' ? (
              /* High-density Scroll-free Stacked Flex List layout */
              <div className="space-y-2.5">
                {filteredOrders.map((order) => (
                  <div 
                    key={order._id}
                    className={`bg-white rounded-2xl border p-3 flex flex-col gap-2.5 transition-all shadow-sm ${
                      order.status === 'COLLECTED' 
                        ? 'border-slate-100 opacity-70' 
                        : 'border-slate-100 hover:border-blue-200'
                    } ${selectedOrderIds.includes(order._id) ? 'bg-blue-50/10 border-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.05)]' : ''}`}
                  >
                    {/* Top Row: Checkbox, Avatar, Name & ID, and Action Button */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {order.status === 'ORDERED' && (
                          <input 
                            type="checkbox"
                            checked={selectedOrderIds.includes(order._id)}
                            onChange={() => toggleSelectOrder(order._id)}
                            className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                        )}
                        
                        <div className="h-8.5 w-8.5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-200">
                          {order.employeeName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-[11px] truncate leading-tight">{order.employeeName}</p>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate leading-none">
                            {order.employeeNo} • {order.phoneNumber}
                          </p>
                        </div>
                      </div>
                      
                      <div className="shrink-0">
                        {order.status === 'ORDERED' ? (
                          <button
                            onClick={() => handleMarkAsCollected(order._id)}
                            disabled={updatingOrderId === order._id || updatingOrderId === 'BULK'}
                            className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-lg text-[9px] shadow-sm transition-all active:scale-95 inline-flex items-center justify-center gap-1"
                          >
                            {updatingOrderId === order._id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3 stroke-[2.25]" />
                            )}
                            Collect
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 fill-green-50 stroke-green-600" />
                            Collected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Badges, Notes, and Time */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-2 text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] tracking-wider uppercase ${
                          order.mealType === 'BREAKFAST'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : order.mealType === 'LUNCH'
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {order.mealType}
                        </span>
                        {order.mealOption && (
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] tracking-wider ${
                            order.mealOption === 'VEGETARIAN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {order.mealOption === 'VEGETARIAN' ? 'VEG' : 'MEAT'}
                          </span>
                        )}
                        {order.notes && (
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-800 rounded font-bold text-[8px] flex items-center gap-0.5 truncate max-w-[155px]" title={order.notes}>
                            🍵 {order.notes}
                          </span>
                        )}
                      </div>
                      
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">
                        {(() => {
                          const dateObj = new Date(order.status === 'COLLECTED' && order.collectedAt ? order.collectedAt : order.requestedAt);
                          return format(dateObj, 'h:mm a');
                        })()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Single-Column Card layout for MobileFrame */
              <div className="grid grid-cols-1 gap-4">
                {filteredOrders.map((order) => (
                  <div 
                    key={order._id}
                    className={`bg-white rounded-2xl border flex flex-col transition-all overflow-hidden relative shadow-sm ${
                      order.status === 'COLLECTED' 
                        ? 'border-slate-100 opacity-70' 
                        : 'border-slate-100 hover:border-blue-200'
                    } ${selectedOrderIds.includes(order._id) ? 'bg-blue-50/10 border-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.05)]' : ''}`}
                  >
                    {/* Header Row */}
                    <div className="px-4 pt-4 pb-2 border-b border-slate-50 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        {order.status === 'ORDERED' && (
                          <input 
                            type="checkbox"
                            checked={selectedOrderIds.includes(order._id)}
                            onChange={() => toggleSelectOrder(order._id)}
                            className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                        )}
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] tracking-wider uppercase ${
                          order.mealType === 'BREAKFAST'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : order.mealType === 'LUNCH'
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {order.mealType}
                        </span>
                        {order.mealOption && (
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] tracking-wider ${
                            order.mealOption === 'VEGETARIAN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {order.mealOption === 'VEGETARIAN' ? 'VEG' : 'MEAT'}
                          </span>
                        )}
                      </div>
                      
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">
                        {format(new Date(order.requestedAt), 'h:mm a')}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-800 leading-tight">
                          {order.employeeName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 leading-none">
                          {order.employeeNo} • {order.phoneNumber}
                        </p>
                        
                        {order.notes && (
                          <div className="mt-2.5 text-xs bg-amber-50 border border-amber-100 text-amber-850 rounded-xl p-2.5 font-medium leading-relaxed">
                            <span className="font-extrabold text-amber-700 block text-[9px] uppercase tracking-wider mb-1">Note / Snack Request</span>
                            &ldquo;{order.notes}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                        {order.employeeName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                      </div>
                    </div>

                    {/* Actions Area */}
                    {order.status === 'ORDERED' ? (
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => handleMarkAsCollected(order._id)}
                          disabled={updatingOrderId === order._id || updatingOrderId === 'BULK'}
                          className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-1.5"
                        >
                          {updatingOrderId === order._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 stroke-[2.25]" />
                          )}
                          Mark as Collected
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-green-600">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 fill-green-50 stroke-green-600" />
                          Collected
                        </span>
                        <span className="text-slate-400">
                          {order.collectedAt ? format(new Date(order.collectedAt), 'h:mm a') : ''}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40 animate-in slide-in-from-bottom-5 duration-250">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold">{selectedOrderIds.length} selected</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedOrderIds([])}
                className="h-9 px-3 border border-slate-800 hover:bg-slate-800 rounded-xl text-[10px] font-bold transition-all text-slate-300"
              >
                Deselect
              </button>
              <button
                onClick={handleBulkMarkAsCollected}
                disabled={updatingOrderId === 'BULK'}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white font-bold rounded-xl text-[10px] shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                {updatingOrderId === 'BULK' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 stroke-[2.25]" />
                )}
                Mark Collected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
