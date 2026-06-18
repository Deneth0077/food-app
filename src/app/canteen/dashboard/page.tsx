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
  Download,
  X,
  Clock,
  Lock,
  Unlock,
  Calendar
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
  const [tomorrowOrders, setTomorrowOrders] = useState<Order[]>([]);
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
  const [scanEmployeeNo, setScanEmployeeNo] = useState('');
  const [selectedMealDetails, setSelectedMealDetails] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | null>(null);
  const [selectedMealDetailsDate, setSelectedMealDetailsDate] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const handleDownloadSingleMealPDF = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    const mealOrders = orders.filter(o => o.mealType === mealType);
    const targetFormattedDate = format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM dd, yyyy');
    
    const summaryRows = `
      <tr>
        <td><strong>${mealType.charAt(0) + mealType.slice(1).toLowerCase()}</strong></td>
        <td>${mealOrders.filter(o => o.mealOption === 'VEGETARIAN').length}</td>
        <td>${mealOrders.filter(o => o.mealOption === 'MEAT').length}</td>
        <td><strong>${mealOrders.length}</strong></td>
      </tr>
    `;
    
    const htmlContent = `
      <html>
        <head>
          <title>Meal Logistics Report - ${mealType} - ${selectedDate}</title>
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
            <p>${mealType} Operations Report - ${targetFormattedDate}</p>
          </div>
          
          <h2>Summary</h2>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Meal Time</th>
                <th>Vegetarian</th>
                <th>Non Veg</th>
                <th>Total Orders</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRows}
            </tbody>
          </table>
          
          <div class="meal-section">
            <div class="meal-title">${mealType} Orders for ${selectedDate} (${mealOrders.length})</div>
            ${mealOrders.length === 0 ? '<p style="font-size: 10px; color: #777;">No orders placed for this date.</p>' : `
              <table class="order-table">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Meal Date</th>
                    <th>Option</th>
                    <th>Notes / Requests</th>
                  </tr>
                </thead>
                <tbody>
                  ${mealOrders.map(o => `
                    <tr>
                      <td>${o.employeeNo}</td>
                      <td><strong>${o.employeeName}</strong></td>
                      <td>${o.phoneNumber}</td>
                      <td><strong>${o.requestDate}</strong></td>
                      <td><span class="${o.mealOption === 'VEGETARIAN' ? 'veg-pill' : 'meat-pill'}">${o.mealOption === 'VEGETARIAN' ? 'VEG' : 'NON-VEG'}</span></td>
                      <td class="notes-text">${o.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </body>
      </html>
    `;
    
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    document.body.appendChild(element);

    const runHtml2Pdf = async () => {
      try {
        const jsPDF = (await import('jspdf' as any)).default;
        const html2canvas = (await import('html2canvas-pro' as any)).default;

        html2canvas(element, {
          scale: 2,
          logging: false,
          useCORS: true,
          backgroundColor: '#ffffff'
        }).then((canvas: HTMLCanvasElement) => {
          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = 210;
          const pageHeight = 297;
          const margin = 10;
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          let heightLeft = imgHeight;
          let position = margin;

          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
          heightLeft -= (pageHeight - margin * 2);

          while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - margin * 2);
          }
          
          pdf.save(`Meal_Logistics_Report_${mealType}_${selectedDate}.pdf`);

          document.body.removeChild(element);
          toast({
            title: 'Report Downloaded',
            description: `${mealType} operations report for ${selectedDate} has been downloaded.`,
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
      } catch (err: any) {
        console.error('Failed to load local PDF libraries:', err);
        document.body.removeChild(element);
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description: 'Failed to load modern HTML canvas rendering library.',
        });
      }
    };

    runHtml2Pdf();
  };

  const getTomorrowDateStr = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    return format(date, 'yyyy-MM-dd');
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      const tomorrowDateStr = getTomorrowDateStr(selectedDate);

      const [resToday, resTomorrow] = await Promise.all([
        fetch(`/api/orders?requestDate=${selectedDate}`),
        fetch(`/api/orders?requestDate=${tomorrowDateStr}`)
      ]);

      if (!resToday.ok) {
        if (resToday.status === 401 || resToday.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error("Failed to load today's orders");
      }

      if (!resTomorrow.ok) {
        throw new Error("Failed to load tomorrow's orders");
      }

      const [dataToday, dataTomorrow] = await Promise.all([
        resToday.json(),
        resTomorrow.json()
      ]);

      setOrders(dataToday.orders || []);
      setTomorrowOrders(dataTomorrow.orders || []);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      setTomorrowOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'COLLECTED', collectedAt: new Date().toISOString() } : o));
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

  const handleQuickScanCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    const empNo = scanEmployeeNo.trim().toUpperCase();
    if (!empNo) return;

    // Find a pending (ORDERED) order for this employee on the selected date
    const targetOrder = orders.find(o => 
      o.employeeNo.toUpperCase() === empNo && 
      o.status === 'ORDERED'
    );

    if (!targetOrder) {
      toast({
        variant: 'destructive',
        title: 'Not Found / Already Collected',
        description: `No pending meal request found for employee "${empNo}" today.`,
      });
      setScanEmployeeNo('');
      return;
    }

    // Clear input immediately to prepare for next scan
    setScanEmployeeNo('');
    
    // Call the collection handler
    await handleMarkAsCollected(targetOrder._id);
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

  const isMealDeadlinePassed = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER', targetDateStr: string) => {
    // Parse target date strictly in local time to avoid timezone drift
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    
    let lockTime: Date;
    if (mealType === 'BREAKFAST') {
      const dayBefore = new Date(targetDate.getTime());
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(20, 0, 0, 0); // 8:00 PM the day before
      lockTime = dayBefore;
    } else if (mealType === 'LUNCH') {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(9, 0, 0, 0); // 9:00 AM the day of
      lockTime = dayOf;
    } else {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(17, 0, 0, 0); // 5:00 PM the day of
      lockTime = dayOf;
    }
    
    return currentTime.getTime() >= lockTime.getTime();
  };

  const isMealActivelyPreparing = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER', targetDateStr: string) => {
    // Parse target date strictly in local time to avoid timezone drift
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    
    let prepStart: Date;
    let prepEnd: Date;
    
    if (mealType === 'BREAKFAST') {
      const dayBefore = new Date(targetDate.getTime());
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(20, 0, 0, 0); // 8:00 PM the day before
      prepStart = dayBefore;
      
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(9, 0, 0, 0); // 9:00 AM the day of
      prepEnd = dayOf;
    } else if (mealType === 'LUNCH') {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(9, 0, 0, 0); // 9:00 AM the day of
      prepStart = dayOf;
      
      const dayOfEnd = new Date(targetDate.getTime());
      dayOfEnd.setHours(14, 0, 0, 0); // 2:00 PM the day of
      prepEnd = dayOfEnd;
    } else {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(17, 0, 0, 0); // 5:00 PM the day of
      prepStart = dayOf;
      
      const dayOfEnd = new Date(targetDate.getTime());
      dayOfEnd.setHours(21, 0, 0, 0); // 9:00 PM the day of
      prepEnd = dayOfEnd;
    }
    
    const timeMs = currentTime.getTime();
    return timeMs >= prepStart.getTime() && timeMs < prepEnd.getTime();
  };


  const handleDownloadPDF = () => {
    const targetFormattedDate = format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM dd, yyyy');
    
    // Group orders
    const breakfasts = orders.filter(o => o.mealType === 'BREAKFAST');
    const lunches = orders.filter(o => o.mealType === 'LUNCH');
    const dinners = orders.filter(o => o.mealType === 'DINNER');

    const renderBreakfast = selectedMealFilter === 'ALL' || selectedMealFilter === 'BREAKFAST';
    const renderLunch = selectedMealFilter === 'ALL' || selectedMealFilter === 'LUNCH';
    const renderDinner = selectedMealFilter === 'ALL' || selectedMealFilter === 'DINNER';
    
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
                <th>Non Veg</th>
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
              <div class="meal-title">Breakfast Orders for ${selectedDate} (${breakfasts.length})</div>
              ${breakfasts.length === 0 ? '<p style="font-size: 10px; color: #777;">No breakfast orders placed for this date.</p>' : `
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Meal Date</th>
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
                        <td><strong>${o.requestDate}</strong></td>
                        <td><span class="${o.mealOption === 'VEGETARIAN' ? 'veg-pill' : 'meat-pill'}">${o.mealOption === 'VEGETARIAN' ? 'VEG' : 'NON-VEG'}</span></td>
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
              <div class="meal-title">Lunch Orders for ${selectedDate} (${lunches.length})</div>
              ${lunches.length === 0 ? '<p style="font-size: 10px; color: #777;">No lunch orders placed for this date.</p>' : `
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Meal Date</th>
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
                        <td><strong>${o.requestDate}</strong></td>
                        <td><span class="${o.mealOption === 'VEGETARIAN' ? 'veg-pill' : 'meat-pill'}">${o.mealOption === 'VEGETARIAN' ? 'VEG' : 'NON-VEG'}</span></td>
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
              <div class="meal-title">Dinner Orders for ${selectedDate} (${dinners.length})</div>
              ${dinners.length === 0 ? '<p style="font-size: 10px; color: #777;">No dinner orders placed for this date.</p>' : `
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Meal Date</th>
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
                        <td><strong>${o.requestDate}</strong></td>
                        <td><span class="${o.mealOption === 'VEGETARIAN' ? 'veg-pill' : 'meat-pill'}">${o.mealOption === 'VEGETARIAN' ? 'VEG' : 'NON-VEG'}</span></td>
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

    const runHtml2Pdf = async () => {
      try {
        const jsPDF = (await import('jspdf' as any)).default;
        const html2canvas = (await import('html2canvas-pro' as any)).default;

        html2canvas(element, {
          scale: 2,
          logging: false,
          useCORS: true,
          backgroundColor: '#ffffff'
        }).then((canvas: HTMLCanvasElement) => {
          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = 210;
          const pageHeight = 297;
          const margin = 10;
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          let heightLeft = imgHeight;
          let position = margin;

          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
          heightLeft -= (pageHeight - margin * 2);

          while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - margin * 2);
          }
          
          pdf.save(`Meal_Logistics_Report_${selectedDate}.pdf`);

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
      } catch (err: any) {
        console.error('Failed to load local PDF libraries:', err);
        document.body.removeChild(element);
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description: 'Failed to load modern HTML canvas rendering library.',
        });
      }
    };

    runHtml2Pdf();
  };

  const handleCollectAllAndDownloadPDF = async () => {
    const pendingFiltered = filteredOrders.filter(o => o.status === 'ORDERED');
    
    if (pendingFiltered.length > 0) {
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

        const now = new Date().toISOString();
        setOrders(prev => prev.map(o => 
          pendingIds.includes(o._id) 
            ? { ...o, status: 'COLLECTED', collectedAt: now } 
            : o
        ));
        setSelectedOrderIds([]);
        
        toast({
          title: 'Auto-Collection Completed',
          description: `Successfully collected all ${pendingFiltered.length} active orders before download.`,
        });
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Auto-Collection Failed',
          description: err.message || 'Something went wrong',
        });
        setUpdatingOrderId(null);
        return;
      } finally {
        setUpdatingOrderId(null);
      }
    }
    
    handleDownloadPDF();
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

  // Expected stats counts for a list of orders
  const getMealProgressForOrders = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER', ordersList: Order[]) => {
    const mealOrders = ordersList.filter(o => o.mealType === mealType);
    const total = mealOrders.length;
    const collected = mealOrders.filter(o => o.status === 'COLLECTED').length;
    const pct = total > 0 ? Math.round((collected / total) * 100) : 0;
    
    // Veg/Meat stats
    const vegCount = mealOrders.filter(o => o.mealOption === 'VEGETARIAN').length;
    const meatCount = mealOrders.filter(o => o.mealOption === 'MEAT').length;
    
    return { total, collected, pct, vegCount, meatCount };
  };

  const breakfastProgress = getMealProgressForOrders('BREAKFAST', orders);
  const lunchProgress = getMealProgressForOrders('LUNCH', orders);
  const dinnerProgress = getMealProgressForOrders('DINNER', orders);

  const tomorrowBreakfastProgress = getMealProgressForOrders('BREAKFAST', tomorrowOrders);
  const tomorrowLunchProgress = getMealProgressForOrders('LUNCH', tomorrowOrders);
  const tomorrowDinnerProgress = getMealProgressForOrders('DINNER', tomorrowOrders);

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
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleLogout}
            className="p-2.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-50 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
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

          {/* Quick Scan / Key-In Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-2">
            <label htmlFor="scanEmployeeInput" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Barcode Scan / Key-In Employee ID (Auto-Collect)
            </label>
            <form onSubmit={handleQuickScanCollect} className="flex gap-2">
              <input
                id="scanEmployeeInput"
                type="text"
                placeholder="Scan badge barcode or type employee ID (e.g. EMP004) & press Enter..."
                value={scanEmployeeNo}
                onChange={(e) => setScanEmployeeNo(e.target.value)}
                className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus-visible:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!scanEmployeeNo.trim()}
                className="h-11 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                Collect
              </button>
            </form>
          </div>

          <div className="flex items-center justify-between pt-1">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Overview for {format(new Date(selectedDate + 'T00:00:00'), 'MMM dd, yyyy')}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Breakfast Stats Card */}
            <div 
              onClick={() => {
                setSelectedMealDetails('BREAKFAST');
                setSelectedMealDetailsDate(selectedDate);
              }}
              className={`bg-white rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-amber-300 active:scale-[0.98] ${
                isMealActivelyPreparing('BREAKFAST', selectedDate)
                  ? 'canteen-locked-card'
                  : 'border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Coffee className="h-4.5 w-4.5" />
                </div>
                {isMealActivelyPreparing('BREAKFAST', selectedDate) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-rose-600 text-white shadow-sm border border-rose-700 font-black">
                    <span className="animate-pulse flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-ping shrink-0" />
                      🍳 Start Preparing
                    </span>
                  </span>
                ) : isMealDeadlinePassed('BREAKFAST', selectedDate) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200">
                    Closed
                  </span>
                ) : (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Open
                  </span>
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-xl font-bold text-slate-800 leading-tight">{breakfastProgress.total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-none">Breakfast</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${breakfastProgress.pct}%` }} />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-2.5 mb-1.5 leading-none">
                  <span>Collected: {breakfastProgress.collected}/{breakfastProgress.total}</span>
                </div>
                <div className="flex gap-1.5 mt-1.5 bg-slate-50/60 p-1 rounded-lg border border-slate-100">
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-[0_1px_2px_rgba(16,185,129,0.03)]">
                    V: {breakfastProgress.vegCount}
                  </span>
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-rose-50 text-rose-700 border border-rose-100 shadow-[0_1px_2px_rgba(244,63,94,0.03)]">
                    NV: {breakfastProgress.meatCount}
                  </span>
                </div>
                <p className="text-[7px] text-slate-400 font-semibold mt-1.5 italic leading-none flex items-center gap-0.5">
                  <Clock className="h-2 w-2" /> Cutoff: Prev Day 8 PM
                </p>
              </div>
            </div>

            {/* Lunch Stats Card */}
            <div 
              onClick={() => {
                setSelectedMealDetails('LUNCH');
                setSelectedMealDetailsDate(selectedDate);
              }}
              className={`bg-white rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-blue-300 active:scale-[0.98] ${
                isMealActivelyPreparing('LUNCH', selectedDate)
                  ? 'canteen-locked-card'
                  : 'border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-555 flex items-center justify-center">
                  <Utensils className="h-4.5 w-4.5" />
                </div>
                {isMealActivelyPreparing('LUNCH', selectedDate) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-rose-600 text-white shadow-sm border border-rose-700 font-black">
                    <span className="animate-pulse flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-ping shrink-0" />
                      🍳 Start Preparing
                    </span>
                  </span>
                ) : isMealDeadlinePassed('LUNCH', selectedDate) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200">
                    Closed
                  </span>
                ) : (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Open
                  </span>
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-xl font-bold text-slate-800 leading-tight">{lunchProgress.total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-none">Lunch</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${lunchProgress.pct}%` }} />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-2.5 mb-1.5 leading-none">
                  <span>Collected: {lunchProgress.collected}/{lunchProgress.total}</span>
                </div>
                <div className="flex gap-1.5 mt-1.5 bg-slate-50/60 p-1 rounded-lg border border-slate-100">
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-[0_1px_2px_rgba(16,185,129,0.03)]">
                    V: {lunchProgress.vegCount}
                  </span>
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-rose-50 text-rose-700 border border-rose-100 shadow-[0_1px_2px_rgba(244,63,94,0.03)]">
                    NV: {lunchProgress.meatCount}
                  </span>
                </div>
                <p className="text-[7px] text-slate-400 font-semibold mt-1.5 italic leading-none flex items-center gap-0.5">
                  <Clock className="h-2 w-2" /> Cutoff: Today 9 AM
                </p>
              </div>
            </div>

            {/* Dinner Stats Card */}
            <div 
              onClick={() => {
                setSelectedMealDetails('DINNER');
                setSelectedMealDetailsDate(selectedDate);
              }}
              className={`bg-white rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-indigo-300 active:scale-[0.98] ${
                isMealActivelyPreparing('DINNER', selectedDate)
                  ? 'canteen-locked-card'
                  : 'border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                  <Moon className="h-4.5 w-4.5" />
                </div>
                {isMealActivelyPreparing('DINNER', selectedDate) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-rose-600 text-white shadow-sm border border-rose-700 font-black">
                    <span className="animate-pulse flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-ping shrink-0" />
                      🍳 Start Preparing
                    </span>
                  </span>
                ) : isMealDeadlinePassed('DINNER', selectedDate) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200">
                    Closed
                  </span>
                ) : (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Open
                  </span>
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-xl font-bold text-slate-800 leading-tight">{dinnerProgress.total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-none">Dinner</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${dinnerProgress.pct}%` }} />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-2.5 mb-1.5 leading-none">
                  <span>Collected: {dinnerProgress.collected}/{dinnerProgress.total}</span>
                </div>
                <div className="flex gap-1.5 mt-1.5 bg-slate-50/60 p-1 rounded-lg border border-slate-100">
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-[0_1px_2px_rgba(16,185,129,0.03)]">
                    V: {dinnerProgress.vegCount}
                  </span>
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-rose-50 text-rose-700 border border-rose-100 shadow-[0_1px_2px_rgba(244,63,94,0.03)]">
                    NV: {dinnerProgress.meatCount}
                  </span>
                </div>
                <p className="text-[7px] text-slate-400 font-semibold mt-1.5 italic leading-none flex items-center gap-0.5">
                  <Clock className="h-2 w-2" /> Cutoff: Today 5 PM
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Overview for Tomorrow ({format(new Date(getTomorrowDateStr(selectedDate) + 'T00:00:00'), 'MMM dd, yyyy')})
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Tomorrow's Breakfast Stats Card */}
            <div 
              onClick={() => {
                setSelectedMealDetails('BREAKFAST');
                setSelectedMealDetailsDate(getTomorrowDateStr(selectedDate));
              }}
              className={`bg-white rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-amber-300 active:scale-[0.98] ${
                isMealActivelyPreparing('BREAKFAST', getTomorrowDateStr(selectedDate))
                  ? 'canteen-locked-card'
                  : 'border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Coffee className="h-4.5 w-4.5" />
                </div>
                {isMealActivelyPreparing('BREAKFAST', getTomorrowDateStr(selectedDate)) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-rose-600 text-white shadow-sm border border-rose-700 font-black">
                    <span className="animate-pulse flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-ping shrink-0" />
                      🍳 Start Preparing
                    </span>
                  </span>
                ) : isMealDeadlinePassed('BREAKFAST', getTomorrowDateStr(selectedDate)) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200">
                    Closed
                  </span>
                ) : (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Open
                  </span>
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-xl font-bold text-slate-800 leading-tight">{tomorrowBreakfastProgress.total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-none">Breakfast</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${tomorrowBreakfastProgress.pct}%` }} />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-2.5 mb-1.5 leading-none">
                  <span>Collected: {tomorrowBreakfastProgress.collected}/{tomorrowBreakfastProgress.total}</span>
                </div>
                <div className="flex gap-1.5 mt-1.5 bg-slate-50/60 p-1 rounded-lg border border-slate-100">
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-[0_1px_2px_rgba(16,185,129,0.03)]">
                    V: {tomorrowBreakfastProgress.vegCount}
                  </span>
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-rose-50 text-rose-700 border border-rose-100 shadow-[0_1px_2px_rgba(244,63,94,0.03)]">
                    NV: {tomorrowBreakfastProgress.meatCount}
                  </span>
                </div>
                <p className="text-[7px] text-slate-400 font-semibold mt-1.5 italic leading-none flex items-center gap-0.5">
                  <Clock className="h-2 w-2" /> Cutoff: Prev Day 8 PM
                </p>
              </div>
            </div>

            {/* Tomorrow's Lunch Stats Card */}
            <div 
              onClick={() => {
                setSelectedMealDetails('LUNCH');
                setSelectedMealDetailsDate(getTomorrowDateStr(selectedDate));
              }}
              className={`bg-white rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-blue-300 active:scale-[0.98] ${
                isMealActivelyPreparing('LUNCH', getTomorrowDateStr(selectedDate))
                  ? 'canteen-locked-card'
                  : 'border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-555 flex items-center justify-center">
                  <Utensils className="h-4.5 w-4.5" />
                </div>
                {isMealActivelyPreparing('LUNCH', getTomorrowDateStr(selectedDate)) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-rose-600 text-white shadow-sm border border-rose-700 font-black">
                    <span className="animate-pulse flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-ping shrink-0" />
                      🍳 Start Preparing
                    </span>
                  </span>
                ) : isMealDeadlinePassed('LUNCH', getTomorrowDateStr(selectedDate)) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200">
                    Closed
                  </span>
                ) : (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Open
                  </span>
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-xl font-bold text-slate-800 leading-tight">{tomorrowLunchProgress.total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-none">Lunch</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${tomorrowLunchProgress.pct}%` }} />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-2.5 mb-1.5 leading-none">
                  <span>Collected: {tomorrowLunchProgress.collected}/{tomorrowLunchProgress.total}</span>
                </div>
                <div className="flex gap-1.5 mt-1.5 bg-slate-50/60 p-1 rounded-lg border border-slate-100">
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-[0_1px_2px_rgba(16,185,129,0.03)]">
                    V: {tomorrowLunchProgress.vegCount}
                  </span>
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-rose-50 text-rose-700 border border-rose-100 shadow-[0_1px_2px_rgba(244,63,94,0.03)]">
                    NV: {tomorrowLunchProgress.meatCount}
                  </span>
                </div>
                <p className="text-[7px] text-slate-400 font-semibold mt-1.5 italic leading-none flex items-center gap-0.5">
                  <Clock className="h-2 w-2" /> Cutoff: Today 9 AM
                </p>
              </div>
            </div>

            {/* Tomorrow's Dinner Stats Card */}
            <div 
              onClick={() => {
                setSelectedMealDetails('DINNER');
                setSelectedMealDetailsDate(getTomorrowDateStr(selectedDate));
              }}
              className={`bg-white rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-indigo-300 active:scale-[0.98] ${
                isMealActivelyPreparing('DINNER', getTomorrowDateStr(selectedDate))
                  ? 'canteen-locked-card'
                  : 'border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                  <Moon className="h-4.5 w-4.5" />
                </div>
                {isMealActivelyPreparing('DINNER', getTomorrowDateStr(selectedDate)) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-rose-600 text-white shadow-sm border border-rose-700 font-black">
                    <span className="animate-pulse flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-ping shrink-0" />
                      🍳 Start Preparing
                    </span>
                  </span>
                ) : isMealDeadlinePassed('DINNER', getTomorrowDateStr(selectedDate)) ? (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200">
                    Closed
                  </span>
                ) : (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Open
                  </span>
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-xl font-bold text-slate-800 leading-tight">{tomorrowDinnerProgress.total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-none">Dinner</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${tomorrowDinnerProgress.pct}%` }} />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-2.5 mb-1.5 leading-none">
                  <span>Collected: {tomorrowDinnerProgress.collected}/{tomorrowDinnerProgress.total}</span>
                </div>
                <div className="flex gap-1.5 mt-1.5 bg-slate-50/60 p-1 rounded-lg border border-slate-100">
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-[0_1px_2px_rgba(16,185,129,0.03)]">
                    V: {tomorrowDinnerProgress.vegCount}
                  </span>
                  <span className="flex-1 text-center py-1 text-[11px] font-black rounded bg-rose-50 text-rose-700 border border-rose-100 shadow-[0_1px_2px_rgba(244,63,94,0.03)]">
                    NV: {tomorrowDinnerProgress.meatCount}
                  </span>
                </div>
                <p className="text-[7px] text-slate-400 font-semibold mt-1.5 italic leading-none flex items-center gap-0.5">
                  <Clock className="h-2 w-2" /> Cutoff: Today 5 PM
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
                onClick={handleCollectAllAndDownloadPDF}
                disabled={updatingOrderId === 'BULK'}
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white rounded-xl text-[10px] font-extrabold tracking-wide flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                {updatingOrderId === 'BULK' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 stroke-[2.25]" />
                )}
                Auto Collect &amp; Download PDF
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-extrabold tracking-wide flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF Only
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
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-650 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`flex-1 h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    viewMode === 'TABLE' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  List Layout
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('CARDS')}
                  className={`flex-1 h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    viewMode === 'CARDS' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Cards Layout
                </button>
              </div>

              {/* Collapsible Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full h-11 rounded-xl border font-bold text-xs flex items-center justify-between px-4 transition-all duration-200 ${
                  showFilters 
                    ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.05)]' 
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filter Options
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {showFilters ? 'Hide' : 'Show'}
                </span>
              </button>
            </div>

            {/* Quick Segment Controls (ALWAYS Stacked Vertically on Desktop in 480px frame) */}
            {showFilters && (
              <div className="flex flex-col gap-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Meal Filter Tabs */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Meal Time</span>
                  <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                    {['ALL', 'BREAKFAST', 'LUNCH', 'DINNER'].map(meal => (
                      <button
                        key={meal}
                        type="button"
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
                        type="button"
                        onClick={() => { setSelectedPreferenceFilter(pref as any); setSelectedOrderIds([]); }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${
                          selectedPreferenceFilter === pref 
                            ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {pref === 'ALL' ? 'All' : pref === 'VEGETARIAN' ? 'Veg' : 'Non Veg'}
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
                        type="button"
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
            )}
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
                            {order.mealOption === 'VEGETARIAN' ? 'VEG' : 'NON-VEG'}
                          </span>
                        )}
                        {order.notes && (
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-800 rounded font-bold text-[8px] flex items-center gap-0.5 truncate max-w-[155px]" title={order.notes}>
                            📝 {order.notes}
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
                            {order.mealOption === 'VEGETARIAN' ? 'VEG' : 'NON-VEG'}
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
                          <div className="mt-2.5 text-xs bg-amber-50 border border-amber-100 text-amber-855 rounded-xl p-2.5 font-medium leading-relaxed">
                            <span className="font-extrabold text-amber-700 block text-[9px] uppercase tracking-wider mb-1">Special Request</span>
                            📝 &ldquo;{order.notes}&rdquo;
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

      {/* Canteen Orders Detailed Modal */}
      {selectedMealDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ease-out animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setSelectedMealDetails(null)}></div>
          
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] transition-all duration-300 ease-out transform animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              {(() => {
                const targetOrders = selectedMealDetailsDate === selectedDate ? orders : tomorrowOrders;
                const mealOrders = targetOrders.filter(o => o.mealType === selectedMealDetails);
                
                return (
                  <>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="capitalize">{selectedMealDetails.toLowerCase()}</span> Orders List
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> {selectedMealDetailsDate} • {mealOrders.length} Orders Total
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedMealDetails(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-full transition-colors"
                      title="Close"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </>
                );
              })()}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 min-h-[200px]">
              {(() => {
                const targetOrders = selectedMealDetailsDate === selectedDate ? orders : tomorrowOrders;
                const mealOrders = targetOrders.filter(o => o.mealType === selectedMealDetails);
                if (mealOrders.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 font-bold text-xs gap-2">
                      <CircleAlert className="h-8 w-8 text-slate-350" />
                      No orders placed for this meal on {selectedMealDetailsDate}.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[9px] font-extrabold bg-slate-50/50">
                          <th className="py-2.5 px-3">Emp ID</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">Choice</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {mealOrders.map((order) => (
                          <tr key={order._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-extrabold text-slate-550">{order.employeeNo}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">{order.employeeName}</td>
                            <td className="py-2.5 px-3">{order.phoneNumber}</td>
                            <td className="py-2.5 px-3">
                              {order.mealOption ? (
                                <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide ${
                                  order.mealOption === 'VEGETARIAN'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {order.mealOption === 'VEGETARIAN' ? 'VEG' : 'NON-VEG'}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide ${
                                order.status === 'COLLECTED'
                                  ? 'bg-green-50 text-green-700 border border-green-100'
                                  : 'bg-amber-50 text-amber-705 border border-amber-100'
                              }`}>
                                {order.status === 'COLLECTED' ? 'Collected' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 italic text-slate-500 font-medium max-w-[150px] truncate" title={order.notes || ''}>
                              {order.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedMealDetails(null)}
                className="h-10 px-4 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                Close
              </button>
              {orders.filter(o => o.mealType === selectedMealDetails).length > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownloadSingleMealPDF(selectedMealDetails)}
                  className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Download Meal PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
