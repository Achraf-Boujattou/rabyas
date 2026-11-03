import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const STATE_LABELS = {
  neuf: 'Neuf',
  en_service: 'En service',
  en_panne: 'En panne',
  repare: 'Réparé',
  reforme: 'Réformé',
};

const STATE_COLORS = {
  neuf: '#22d3ee',
  en_service: '#3b82f6',
  en_panne: '#f87171',
  repare: '#34d399',
  reforme: '#94a3b8',
};

const EquipmentStateChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        dataKey="total"
        nameKey="etat"
        innerRadius="58%"
        outerRadius="82%"
        paddingAngle={3}
        stroke="none"
      >
        {data.map((item) => (
          <Cell key={item.etat} fill={STATE_COLORS[item.etat] || '#64748b'} />
        ))}
      </Pie>
      <Tooltip
        formatter={(value, _name, item) => [value, STATE_LABELS[item.payload.etat] || item.payload.etat]}
        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }}
      />
    </PieChart>
  </ResponsiveContainer>
);

export default EquipmentStateChart;
