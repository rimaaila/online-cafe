'use client';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function DashboardCharts({ data }: { data: { label: string; orders: number; revenue: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DCE6D2" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis yAxisId="l" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="l" dataKey="orders" name="Orders" fill="#8CC63F" radius={[4, 4, 0, 0]} />
          <Line yAxisId="r" dataKey="revenue" name="Revenue" stroke="#F4A03A" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
