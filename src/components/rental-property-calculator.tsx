import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const RentalPropertyCalculator = () => {
  // Constants
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  const PROPERTY_TYPES = [
    { value: 'single', label: 'Single Family Home' },
    { value: 'multi', label: 'Multi-Family (2-4 Units)' },
    { value: 'apartment', label: 'Apartment Building (5+ Units)' },
    { value: 'condo', label: 'Condominium' },
    { value: 'townhouse', label: 'Townhouse' }
  ];

  // State for inputs
  const [inputs, setInputs] = useState<{
    purchasePrice: number;
    downPayment: number;
    downPaymentType: 'amount' | 'percent';
    closingCosts: number;
    renovationCosts: number;
    interestRate: number;
    amortizationPeriod: number;
    term: number;
    monthlyRent: number;
    vacancyRate: number;
    annualRentIncrease: number;
    propertyTaxes: number;
    insurance: number;
    condoFees: number;
    propertyManagement: number;
    maintenance: number;
    utilities: number;
    otherExpenses: number;
    propertyType?: string;
  }>({
    // Property details
    purchasePrice: 500000,
    downPayment: 100000,
    downPaymentType: 'amount',
    closingCosts: 5000,
    renovationCosts: 0,

    // Mortgage details
    interestRate: 5.5,
    amortizationPeriod: 25,
    term: 5,

    // Rental income
    monthlyRent: 2500,
    vacancyRate: 5,
    annualRentIncrease: 2,

    // Operating expenses
    propertyTaxes: 5000,
    insurance: 1500,
    condoFees: 0,
    propertyManagement: 8, // Percentage of rent
    maintenance: 5, // Percentage of rent
    utilities: 0, // Monthly amount
    otherExpenses: 0 // Monthly amount
  });

  // State for calculated results
  const [results, setResults] = useState<{
    mortgageAmount: number;
    downPaymentPercent: number;
    totalMortgage: number;
    monthlyPayment: number;
    monthlyRentAfterVacancy: number;
    monthlyExpenses: number;
    monthlyCashFlow: number;
    annualCashFlow: number;
    totalMonthlyExpenses: number;
    cashOnCash: number;
    capRate: number;
    grossRentMultiplier: number;
    breakEvenOccupancy: number;
    netOperatingIncome: number;
    expenseRatio: number;
    cashFlowSchedule: Array<{
      year: number;
      rentalIncome: number;
      operatingExpenses: number;
      mortgagePayment: number;
      cashFlow: number;
    }>;
  }>({
    mortgageAmount: 0,
    downPaymentPercent: 0,
    totalMortgage: 0,
    monthlyPayment: 0,
    
    // Rental specific results
    monthlyRentAfterVacancy: 0,
    monthlyExpenses: 0,
    monthlyCashFlow: 0,
    annualCashFlow: 0,
    totalMonthlyExpenses: 0,
    cashOnCash: 0,
    capRate: 0,
    grossRentMultiplier: 0,
    breakEvenOccupancy: 0,
    netOperatingIncome: 0,
    expenseRatio: 0,
    cashFlowSchedule: []
  });

  // State for tab selection
  const [activeTab, setActiveTab] = useState('summary');

  // Utility functions
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatPercent = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value / 100);
  };

  // Handle input changes
  const handleInputChange = (name: keyof typeof inputs, value: string | number): void => {
    // Handle empty string
    if (value === '') {
      setInputs(prev => ({ ...prev, [name]: '' }));
      return;
    }
    
    // Handle numeric fields
    if (typeof inputs[name] === 'number') {
      const numericValue = typeof value === 'string' ? value.replace(/^0+(?=\d)/, '') : String(value);
      value = Number(numericValue);
    }
    
    const updatedInputs = { ...inputs, [name]: value };
  
    // Update related values for down payment
    if (name === 'purchasePrice' && inputs.downPaymentType === 'percent') {
      const purchasePrice = typeof value === 'number' ? value : 0;
      const downPaymentPercent = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      updatedInputs.downPayment = Math.round(purchasePrice * (downPaymentPercent / 100) / 100) * 100;
    } else if (name === 'downPayment') {
      if (inputs.downPaymentType === 'percent') {
        const numValue = Number(value);
        if (numValue > 100) value = 100;
        updatedInputs.downPayment = Number(value);
      } else {
        const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;
        const numValue = Number(value);
        if (numValue > purchasePrice) value = purchasePrice;
        updatedInputs.downPayment = Number(value);
      }
    } else if (name === 'downPaymentType') {
      const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;
      const downPayment = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      
      if (value === 'percent') {
        updatedInputs.downPayment = Math.round((downPayment / purchasePrice) * 100);
      } else {
        updatedInputs.downPayment = Math.round(purchasePrice * (downPayment / 100) / 100) * 100;
      }
    }
  
    setInputs(updatedInputs);
  };

  // Handle blur event for input fields
  const handleBlur = (name: keyof typeof inputs): void => {
    if (inputs[name] === '') {
      setInputs(prev => ({ ...prev, [name]: 0 }));
    }
  };

  // Calculate results whenever inputs change
  useEffect(() => {
    if (Object.values(inputs).some(value => value === '')) {
      return;
    }
    
    calculateResults();
  }, [inputs]);

  // Generate cash flow projections
  const generateCashFlowSchedule = (
    principal: number,
    annualInterestRate: number,
    amortizationYears: number,
    monthlyRentAfterVacancy: number,
    monthlyOperatingExpenses: number,
    annualRentIncrease: number
  ): {
    cashFlowSchedule: Array<{
      year: number;
      rentalIncome: number;
      operatingExpenses: number;
      mortgagePayment: number;
      cashFlow: number;
    }>;
    monthlyPayment: number;
  } => {
    const cashFlowSchedule = [];
    let annualRent = monthlyRentAfterVacancy * 12;
    let annualOperatingExpenses = monthlyOperatingExpenses * 12;
    
    // Calculate monthly mortgage payment
    const monthlyInterestRate = (annualInterestRate / 100) / 12;
    const totalPayments = amortizationYears * 12;
    let monthlyPayment;
    
    if (annualInterestRate === 0) {
      monthlyPayment = principal / totalPayments;
    } else {
      monthlyPayment = principal * 
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalPayments)) / 
        (Math.pow(1 + monthlyInterestRate, totalPayments) - 1);
    }
    
    const annualMortgagePayment = monthlyPayment * 12;
    
    // Process each year
    for (let year = 1; year <= 30; year++) {
      // Calculate annual cash flow for this year
      const annualCashFlow = annualRent - annualOperatingExpenses - annualMortgagePayment;
      
      // Add to cash flow schedule
      cashFlowSchedule.push({
        year,
        rentalIncome: annualRent,
        operatingExpenses: annualOperatingExpenses,
        mortgagePayment: annualMortgagePayment,
        cashFlow: annualCashFlow
      });
      
      // Increase rent for next year based on annual rent increase percentage
      annualRent *= (1 + (annualRentIncrease / 100));
      
      // Increase operating expenses slightly each year (assumption: 2% inflation)
      annualOperatingExpenses *= 1.02;
    }
    
    return {
      cashFlowSchedule,
      monthlyPayment
    };
  };

  // Main calculation function
  const calculateResults = () => {
    // Get input values and ensure they're numbers
    const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;
    
    // Down payment calculations
    let downPaymentAmount, downPaymentPercent;
    if (inputs.downPaymentType === 'amount') {
      downPaymentAmount = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      downPaymentPercent = (downPaymentAmount / purchasePrice) * 100;
    } else {
      downPaymentPercent = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      downPaymentAmount = (purchasePrice * downPaymentPercent) / 100;
    }

    // Ensure down payment meets minimum requirements for investment property (20%)
    const minimumDownPaymentPercent = 20;
    const minimumDownPayment = (minimumDownPaymentPercent / 100) * purchasePrice;
    const actualDownPayment = Math.max(downPaymentAmount, minimumDownPayment);
    const actualDownPaymentPercent = (actualDownPayment / purchasePrice) * 100;
    
    // Calculate mortgage amount
    const mortgageAmount = purchasePrice - actualDownPayment;
    
    // Rental income calculations
    const monthlyRent = typeof inputs.monthlyRent === 'number' ? inputs.monthlyRent : 0;
    const vacancyRate = typeof inputs.vacancyRate === 'number' ? inputs.vacancyRate : 0;
    const monthlyRentAfterVacancy = monthlyRent * (1 - vacancyRate / 100);
    
    // Operating expenses calculations
    const propertyTaxesMonthly = (typeof inputs.propertyTaxes === 'number' ? inputs.propertyTaxes : 0) / 12;
    const insuranceMonthly = (typeof inputs.insurance === 'number' ? inputs.insurance : 0) / 12;
    const condoFees = typeof inputs.condoFees === 'number' ? inputs.condoFees : 0;
    const propertyManagementFee = monthlyRent * (typeof inputs.propertyManagement === 'number' ? inputs.propertyManagement : 0) / 100;
    const maintenanceCosts = monthlyRent * (typeof inputs.maintenance === 'number' ? inputs.maintenance : 0) / 100;
    const utilities = typeof inputs.utilities === 'number' ? inputs.utilities : 0;
    const otherExpenses = typeof inputs.otherExpenses === 'number' ? inputs.otherExpenses : 0;
    
    // Total operating expenses (excluding mortgage)
    const monthlyOperatingExpenses = propertyTaxesMonthly + insuranceMonthly + condoFees + 
                                    propertyManagementFee + maintenanceCosts + utilities + otherExpenses;
    
    // Calculate cash flow
    const cashFlowData = generateCashFlowSchedule(
      mortgageAmount,
      inputs.interestRate,
      inputs.amortizationPeriod,
      monthlyRentAfterVacancy,
      monthlyOperatingExpenses,
      inputs.annualRentIncrease
    );
    
    const monthlyPayment = cashFlowData.monthlyPayment;
    
    // Total monthly expenses (including mortgage)
    const totalMonthlyExpenses = monthlyOperatingExpenses + monthlyPayment;
    
    // Cash flow calculations
    const monthlyCashFlow = monthlyRentAfterVacancy - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    
    // Investment metrics
    const initialInvestment = actualDownPayment + 
                             (typeof inputs.closingCosts === 'number' ? inputs.closingCosts : 0) + 
                             (typeof inputs.renovationCosts === 'number' ? inputs.renovationCosts : 0);
    
    const cashOnCash = initialInvestment > 0 ? (annualCashFlow / initialInvestment) * 100 : 0;
    
    // NOI (Net Operating Income) = Annual Rental Income - Annual Operating Expenses (excluding mortgage)
    const annualRentalIncome = monthlyRentAfterVacancy * 12;
    const annualOperatingExpenses = monthlyOperatingExpenses * 12;
    const netOperatingIncome = annualRentalIncome - annualOperatingExpenses;
    
    // Cap Rate = NOI / Property Value
    const capRate = (netOperatingIncome / purchasePrice) * 100;
    
    // Gross Rent Multiplier = Property Price / Annual Gross Rent
    const grossRentMultiplier = purchasePrice / (monthlyRent * 12);
    
    // Expense Ratio = Operating Expenses / Gross Rental Income
    const expenseRatio = ((monthlyOperatingExpenses * 12) / (monthlyRent * 12)) * 100;
    
    // Break-even Occupancy = Total Expenses / Gross Potential Rental Income
    const breakEvenOccupancy = (totalMonthlyExpenses / monthlyRent) * 100;

    // Update results
    setResults({
      mortgageAmount,
      downPaymentPercent: actualDownPaymentPercent,
      totalMortgage: mortgageAmount,
      monthlyPayment,
      
      // Rental specific results
      monthlyRentAfterVacancy,
      monthlyExpenses: monthlyOperatingExpenses,
      monthlyCashFlow,
      annualCashFlow,
      totalMonthlyExpenses,
      cashOnCash,
      capRate,
      grossRentMultiplier,
      breakEvenOccupancy,
      netOperatingIncome,
      expenseRatio,
      cashFlowSchedule: cashFlowData.cashFlowSchedule
    });
  };

  // Prepare data for expense breakdown chart
  const prepareExpenseBreakdownData = () => {
    const propertyTaxesMonthly = (inputs.propertyTaxes || 0) / 12;
    const insuranceMonthly = (inputs.insurance || 0) / 12;
    const condoFees = inputs.condoFees || 0;
    const propertyManagementFee = (inputs.monthlyRent || 0) * (inputs.propertyManagement || 0) / 100;
    const maintenanceCosts = (inputs.monthlyRent || 0) * (inputs.maintenance || 0) / 100;
    const utilities = inputs.utilities || 0;
    const otherExpenses = inputs.otherExpenses || 0;
    const mortgagePayment = results.monthlyPayment;
    
    return [
      { name: 'Mortgage', value: mortgagePayment },
      { name: 'Property Tax', value: propertyTaxesMonthly },
      { name: 'Insurance', value: insuranceMonthly },
      { name: 'HOA/Condo', value: condoFees },
      { name: 'Property Mgmt', value: propertyManagementFee },
      { name: 'Maintenance', value: maintenanceCosts },
      { name: 'Utilities', value: utilities },
      { name: 'Other', value: otherExpenses }
    ].filter(item => item.value > 0);
  };

  // Prepare data for cash flow projection chart
  const prepareCashFlowProjectionData = () => {
    return results.cashFlowSchedule.slice(0, 10).map(item => ({
      year: item.year,
      cashFlow: item.cashFlow
    }));
  };

  // CustomTooltip for the PieChart
  const CustomTooltip: React.FC<{ active: boolean; payload: { name: string; value: number }[] }> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded">
          <p className="font-medium">{`${payload[0].name}: ${formatCurrency(payload[0].value)}`}</p>
          <p className="text-xs text-gray-500">{`${(payload[0].value / results.totalMonthlyExpenses * 100).toFixed(1)}% of expenses`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white shadow rounded-xl p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-blue-800 mb-4 md:mb-6">Rental Property Calculator</h1>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex overflow-x-auto no-scrollbar pb-1">
          <div className="flex space-x-1 md:space-x-2 border-b min-w-full">
            <button 
              className={`py-2 px-3 md:px-4 text-sm md:text-base font-medium whitespace-nowrap ${activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            <button 
              className={`py-2 px-3 md:px-4 text-sm md:text-base font-medium whitespace-nowrap ${activeTab === 'income' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => setActiveTab('income')}
            >
              Rental Income
            </button>
            <button 
              className={`py-2 px-3 md:px-4 text-sm md:text-base font-medium whitespace-nowrap ${activeTab === 'expenses' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => setActiveTab('expenses')}
            >
              Expenses
            </button>
            <button 
              className={`py-2 px-3 md:px-4 text-sm md:text-base font-medium whitespace-nowrap ${activeTab === 'projections' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => setActiveTab('projections')}
            >
              Projections
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Input section */}
        <div className="lg:col-span-1 space-y-4 mb-4 lg:mb-0">
          {activeTab === 'summary' && (
            <div className="p-4 bg-gray-50 rounded shadow">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Property Details</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Purchase Price</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.purchasePrice}
                    onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                    onBlur={() => handleBlur('purchasePrice')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Down Payment</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      {inputs.downPaymentType === 'amount' ? '$' : '%'}
                    </span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={inputs.downPayment}
                      onChange={(e) => handleInputChange('downPayment', e.target.value)}
                      onBlur={() => handleBlur('downPayment')}
                    />
                  </div>
                  <select
                    className="border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.downPaymentType}
                    onChange={(e) => handleInputChange('downPaymentType', e.target.value)}
                  >
                    <option value="amount">$</option>
                    <option value="percent">%</option>
                  </select>
                </div>
                {results.downPaymentPercent < 20 && (
                  <div className="mt-1 text-sm text-red-600">
                    Investment properties typically require at least 20% down payment
                  </div>
                )}
                <div className="mt-1 text-sm text-gray-600">
                  {inputs.downPaymentType === 'amount'
                    ? `(${(inputs.downPayment / inputs.purchasePrice * 100).toFixed(2)}%)`
                    : `(${formatCurrency(inputs.purchasePrice * inputs.downPayment / 100)})`
                  }
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Property Type</label>
                  <select
                    className="w-full border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.propertyType}
                    onChange={(e) => handleInputChange('propertyType', e.target.value)}
                  >
                    {PROPERTY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Interest Rate (%)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={inputs.interestRate}
                      onChange={(e) => handleInputChange('interestRate', e.target.value)}
                      onBlur={() => handleBlur('interestRate')}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Closing Costs</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={inputs.closingCosts}
                      onChange={(e) => handleInputChange('closingCosts', e.target.value)}
                      onBlur={() => handleBlur('closingCosts')}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Renovation Costs</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={inputs.renovationCosts}
                      onChange={(e) => handleInputChange('renovationCosts', e.target.value)}
                      onBlur={() => handleBlur('renovationCosts')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'income' && (
            <div className="p-4 bg-gray-50 rounded shadow">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Rental Income</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Monthly Rental Income</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.monthlyRent}
                    onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
                    onBlur={() => handleBlur('monthlyRent')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Vacancy Rate (%)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.vacancyRate}
                    onChange={(e) => handleInputChange('vacancyRate', e.target.value)}
                    onBlur={() => handleBlur('vacancyRate')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Annual Rent Increase (%)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.annualRentIncrease}
                    onChange={(e) => handleInputChange('annualRentIncrease', e.target.value)}
                    onBlur={() => handleBlur('annualRentIncrease')}
                  />
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Gross Monthly Rent:</span>
                  <span className="font-medium">{formatCurrency(inputs.monthlyRent)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Vacancy Loss:</span>
                  <span className="font-medium">{formatCurrency(inputs.monthlyRent * inputs.vacancyRate / 100)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Net Monthly Rent:</span>
                  <span>{formatCurrency(results.monthlyRentAfterVacancy)}</span>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'expenses' && (
            <div className="p-4 bg-gray-50 rounded shadow">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Operating Expenses</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Property Taxes (Annual)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.propertyTaxes}
                    onChange={(e) => handleInputChange('propertyTaxes', e.target.value)}
                    onBlur={() => handleBlur('propertyTaxes')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Insurance (Annual)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.insurance}
                    onChange={(e) => handleInputChange('insurance', e.target.value)}
                    onBlur={() => handleBlur('insurance')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">HOA/Condo Fees (Monthly)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.condoFees}
                    onChange={(e) => handleInputChange('condoFees', e.target.value)}
                    onBlur={() => handleBlur('condoFees')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Property Management (% of rent)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.propertyManagement}
                    onChange={(e) => handleInputChange('propertyManagement', e.target.value)}
                    onBlur={() => handleBlur('propertyManagement')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Maintenance (% of rent)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.maintenance}
                    onChange={(e) => handleInputChange('maintenance', e.target.value)}
                    onBlur={() => handleBlur('maintenance')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Utilities (Monthly)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.utilities}
                    onChange={(e) => handleInputChange('utilities', e.target.value)}
                    onBlur={() => handleBlur('utilities')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Other Expenses (Monthly)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.otherExpenses}
                    onChange={(e) => handleInputChange('otherExpenses', e.target.value)}
                    onBlur={() => handleBlur('otherExpenses')}
                  />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'projections' && (
            <div className="p-4 bg-gray-50 rounded shadow">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Projections Settings</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Amortization Period (years)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="30"
                    className="w-full px-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.amortizationPeriod}
                    onChange={(e) => handleInputChange('amortizationPeriod', e.target.value)}
                    onBlur={() => handleBlur('amortizationPeriod')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Mortgage Term (years)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.term}
                    onChange={(e) => handleInputChange('term', e.target.value)}
                    onBlur={() => handleBlur('term')}
                  />
                </div>
              </div>
              
              <div className="p-3 bg-gray-100 rounded mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Annual Rent Increase:</span>
                  <span className="font-medium">{formatPercent(inputs.annualRentIncrease)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Expense Growth Rate:</span>
                  <span className="font-medium">2.0%</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Results section */}
        <div className="lg:col-span-2">
          {activeTab === 'summary' && (
            <>
              <div className="bg-blue-50 p-4 md:p-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Investment Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-white rounded shadow-sm">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Monthly Cash Flow</h4>
                    <p className={`text-xl font-bold ${results.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(results.monthlyCashFlow)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Annual: {formatCurrency(results.annualCashFlow)}</p>
                  </div>
                  
                  <div className="p-3 bg-white rounded shadow-sm">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Cash-on-Cash Return</h4>
                    <p className={`text-xl font-bold ${results.cashOnCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(results.cashOnCash)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Based on initial investment</p>
                  </div>
                  
                  <div className="p-3 bg-white rounded shadow-sm">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Cap Rate</h4>
                    <p className="text-xl font-bold text-blue-600">{formatPercent(results.capRate)}</p>
                    <p className="text-xs text-gray-500 mt-1">Net operating income / Property value</p>
                  </div>
                  
                  <div className="p-3 bg-white rounded shadow-sm">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Initial Investment</h4>
                    <p className="text-xl font-bold text-gray-800">
                      {formatCurrency(inputs.downPayment + inputs.closingCosts + inputs.renovationCosts)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Down payment + closing + renovation costs</p>
                  </div>
                </div>
                
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Monthly Rental Income:</span>
                    <span className="font-medium">{formatCurrency(results.monthlyRentAfterVacancy)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Monthly Expenses:</span>
                    <span className="font-medium">{formatCurrency(results.totalMonthlyExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">- Mortgage Payment:</span>
                    <span className="font-medium">{formatCurrency(results.monthlyPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">- Operating Expenses:</span>
                    <span className="font-medium">{formatCurrency(results.monthlyExpenses)}</span>
                  </div>
                  <div className="flex justify-between pt-2 mt-2 border-t">
                    <span className="font-semibold">= Monthly Cash Flow:</span>
                    <span className={`font-semibold ${results.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(results.monthlyCashFlow)}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Metrics</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Gross Rent Multiplier:</span>
                        <span>{results.grossRentMultiplier.toFixed(1)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Net Operating Income:</span>
                        <span>{formatCurrency(results.netOperatingIncome)}/yr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Expense Ratio:</span>
                        <span>{formatPercent(results.expenseRatio)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Break-even Occupancy:</span>
                        <span>{formatPercent(results.breakEvenOccupancy)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Property Financing</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Purchase Price:</span>
                        <span>{formatCurrency(inputs.purchasePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Down Payment:</span>
                        <span>{formatCurrency(inputs.downPayment)} ({formatPercent(results.downPaymentPercent)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Loan Amount:</span>
                        <span>{formatCurrency(results.totalMortgage)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Interest Rate:</span>
                        <span>{formatPercent(inputs.interestRate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white border rounded-md p-4 shadow">
                  <h3 className="text-md font-semibold mb-4 text-gray-800">Monthly Expense Breakdown</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prepareExpenseBreakdownData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                        >
                          {prepareExpenseBreakdownData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-xs text-center text-gray-500 mt-2">
                    Total Monthly Expenses: {formatCurrency(results.totalMonthlyExpenses)}
                  </div>
                </div>
                
                <div className="bg-white border rounded-md p-4 shadow">
                  <h3 className="text-md font-semibold mb-4 text-gray-800">Annual Cash Flow Projection</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={prepareCashFlowProjectionData()}
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Line
                          type="monotone"
                          dataKey="cashFlow"
                          name="Annual Cash Flow"
                          stroke="#10b981"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-xs text-center text-gray-500 mt-2">
                    10-Year Cash Flow Projection
                  </div>
                </div>
              </div>
              
              {results.monthlyCashFlow < 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded shadow mb-6">
                  <h3 className="text-md font-semibold text-red-700 mb-2">Negative Cash Flow Warning</h3>
                  <p className="text-sm text-red-600">
                    This property is projected to lose {formatCurrency(Math.abs(results.monthlyCashFlow))} per month. 
                    Consider the following to improve cash flow:
                  </p>
                  <ul className="text-sm text-red-600 list-disc pl-5 mt-2">
                    <li>Increase rent if market conditions allow</li>
                    <li>Decrease operating expenses</li>
                    <li>Increase down payment to reduce mortgage amount</li>
                    <li>Look for more favorable financing terms</li>
                  </ul>
                </div>
              )}
              
              {results.cashOnCash < 4 && results.cashOnCash >= 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded shadow mb-6">
                  <h3 className="text-md font-semibold text-yellow-700 mb-2">Low Return Warning</h3>
                  <p className="text-sm text-yellow-600">
                    The cash-on-cash return of {formatPercent(results.cashOnCash)} is below the recommended minimum of 4%.
                    Consider options to improve returns or explore alternative investments.
                  </p>
                </div>
              )}
              
              {results.cashOnCash >= 8 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded shadow mb-6">
                  <h3 className="text-md font-semibold text-green-700 mb-2">Strong Investment Potential</h3>
                  <p className="text-sm text-green-600">
                    The cash-on-cash return of {formatPercent(results.cashOnCash)} indicates a strong investment opportunity.
                    This return exceeds typical market yields for rental properties.
                  </p>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'income' && (
            <div className="bg-white border rounded p-4 shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Rental Income Analysis</h3>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2 text-gray-700">Monthly Income Breakdown</h4>
                <div className="p-4 bg-blue-50 rounded">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">Gross Monthly Rent:</span>
                    <span className="font-semibold">{formatCurrency(inputs.monthlyRent)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">Vacancy Rate:</span>
                    <span className="font-semibold">{formatPercent(inputs.vacancyRate)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">Vacancy Loss:</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(inputs.monthlyRent * inputs.vacancyRate / 100)}</span>
                  </div>
                  <div className="flex justify-between pt-2 mt-2 border-t">
                    <span className="font-semibold">Net Monthly Rent:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(results.monthlyRentAfterVacancy)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2 text-gray-700">Annual Income Analysis</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Rent</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mortgage</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash Flow</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.cashFlowSchedule.slice(0, 5).map((item) => (
                        <tr key={item.year}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.year}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.rentalIncome)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.operatingExpenses)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.mortgagePayment)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-sm font-medium ${item.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(item.cashFlow)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">First 5 years of projected rental income shown</p>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2 text-gray-700">Key Income Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <h5 className="text-xs text-gray-500 mb-1">Price to Rent Ratio</h5>
                    <p className="text-lg font-semibold">
                      {(inputs.purchasePrice / (inputs.monthlyRent * 12)).toFixed(1)}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded">
                    <h5 className="text-xs text-gray-500 mb-1">Gross Rent Multiplier</h5>
                    <p className="text-lg font-semibold">
                      {results.grossRentMultiplier.toFixed(1)}x
                    </p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded">
                    <h5 className="text-xs text-gray-500 mb-1">Rent as % of Purchase</h5>
                    <p className="text-lg font-semibold">
                      {formatPercent((inputs.monthlyRent * 12) / inputs.purchasePrice * 100)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'expenses' && (
            <div className="bg-white border rounded p-4 shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Expense Analysis</h3>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2 text-gray-700">Monthly Expense Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expense</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Annual</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Income</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Mortgage</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(results.monthlyPayment)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(results.monthlyPayment * 12)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatPercent((results.monthlyPayment / inputs.monthlyRent) * 100)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Property Taxes</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(inputs.propertyTaxes / 12)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(inputs.propertyTaxes)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatPercent(((inputs.propertyTaxes / 12) / inputs.monthlyRent) * 100)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Insurance</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(inputs.insurance / 12)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(inputs.insurance)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatPercent(((inputs.insurance / 12) / inputs.monthlyRent) * 100)}
                        </td>
                      </tr>
                      {inputs.condoFees > 0 && (
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">HOA/Condo Fees</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(inputs.condoFees)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(inputs.condoFees * 12)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                            {formatPercent((inputs.condoFees / inputs.monthlyRent) * 100)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Property Management</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatCurrency(inputs.monthlyRent * inputs.propertyManagement / 100)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatCurrency(inputs.monthlyRent * inputs.propertyManagement / 100 * 12)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatPercent(inputs.propertyManagement)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Maintenance</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatCurrency(inputs.monthlyRent * inputs.maintenance / 100)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatCurrency(inputs.monthlyRent * inputs.maintenance / 100 * 12)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatPercent(inputs.maintenance)}
                        </td>
                      </tr>
                      <tr className="bg-blue-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Total Monthly Expenses</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-800">{formatCurrency(results.totalMonthlyExpenses)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-800">{formatCurrency(results.totalMonthlyExpenses * 12)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-800">
                          {formatPercent((results.totalMonthlyExpenses / inputs.monthlyRent) * 100)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium mb-2 text-gray-700">Expense Ratios</h4>
                  <div className="p-4 bg-gray-50 rounded">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700">Operating Expense Ratio:</span>
                      <span className="font-semibold">{formatPercent(results.expenseRatio)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700">Debt Service Ratio:</span>
                      <span className="font-semibold">{formatPercent((results.monthlyPayment / inputs.monthlyRent) * 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Break-even Occupancy:</span>
                      <span className="font-semibold">{formatPercent(results.breakEvenOccupancy)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-gray-700">Monthly Expenses Visualization</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prepareExpenseBreakdownData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                        >
                          {prepareExpenseBreakdownData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip active={true} payload={[]} />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'projections' && (
            <div className="bg-white border rounded p-4 shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Cash Flow Projections</h3>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2 text-gray-700">10-Year Cash Flow Forecast</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rental Income</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Operating Expenses</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mortgage</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cash Flow</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.cashFlowSchedule.slice(0, 10).map((item, index) => {
                        // Calculate cumulative cash flow
                        const cumulativeCashFlow = results.cashFlowSchedule
                          .slice(0, index + 1)
                          .reduce((sum, year) => sum + year.cashFlow, 0);
                          
                        return (
                          <tr key={item.year}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.year}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(item.rentalIncome)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(item.operatingExpenses)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(item.mortgagePayment)}</td>
                            <td className={`px-3 py-2 whitespace-nowrap text-sm text-right font-medium ${item.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(item.cashFlow)}
                            </td>
                            <td className={`px-3 py-2 whitespace-nowrap text-sm text-right font-medium ${cumulativeCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(cumulativeCashFlow)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="h-72 mb-6">
                <h4 className="font-medium mb-2 text-gray-700">Cash Flow Projection Chart</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={results.cashFlowSchedule.slice(0, 10).map((item, index) => {
                      // Calculate cumulative cash flow
                      const cumulativeCashFlow = results.cashFlowSchedule
                        .slice(0, index + 1)
                        .reduce((sum, year) => sum + year.cashFlow, 0);
                        
                      return {
                        year: item.year,
                        annualCashFlow: item.cashFlow,
                        cumulativeCashFlow: cumulativeCashFlow
                      };
                    })}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="annualCashFlow"
                      name="Annual Cash Flow"
                      stroke="#10b981"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeCashFlow"
                      name="Cumulative Cash Flow"
                      stroke="#3b82f6"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="p-4 bg-blue-50 rounded">
                <h4 className="font-medium text-blue-800 mb-2">Investment Summary</h4>
                <p className="text-sm text-gray-700">
                  {results.cashOnCash >= 8 ? 
                    `This property shows strong potential with a ${formatPercent(results.cashOnCash)} cash-on-cash return, well above the typical 5-7% minimum target for rental properties.` : 
                  results.cashOnCash >= 5 ?
                    `This property shows decent potential with a ${formatPercent(results.cashOnCash)} cash-on-cash return, meeting the typical 5-7% minimum target for rental properties.` :
                  results.cashOnCash >= 0 ?
                    `This property shows below-average returns with a ${formatPercent(results.cashOnCash)} cash-on-cash return, under the typical 5-7% minimum target for rental properties.` :
                    `This property shows negative returns with a ${formatPercent(results.cashOnCash)} cash-on-cash return, indicating it may not be suitable as a rental investment.`
                  }
                </p>
                
                <div className="mt-2 text-sm text-gray-700">
                  <p>
                    At a conservative 3% annual appreciation rate, this property could be worth approximately 
                    {' '}{formatCurrency(inputs.purchasePrice * Math.pow(1.03, 10))} in 10 years, potentially adding another
                    {' '}{formatCurrency(inputs.purchasePrice * Math.pow(1.03, 10) - inputs.purchasePrice)} in equity.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 text-center p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          This calculator provides estimates only and should not be considered financial advice.
          Consult with a real estate professional for personalized investment information.
        </p>
      </div>
    </div>
  );
};

export default RentalPropertyCalculator;