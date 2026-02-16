import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { MapPin, Clock, ArrowBigUp, ArrowBigDown, CheckCircle } from 'lucide-react';
import { Deal, DealType, Language } from '../types';
import { getTranslation } from '../translations';

interface DealCardProps {
  deal: Deal;
  onClick: (deal: Deal) => void;
  onVote: (deal: Deal, direction: number) => void;
  lang: Language;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, onClick, onVote, lang }) => {
  const { isDark } = useTheme();
  const t = (key: any) => getTranslation(lang, key);

  // Calculate discount percentage
  const discount = deal.originalPrice
    ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
    : 0;

  const getTypeColor = (type: DealType) => {
    switch(type) {
        case DealType.OPENING: return 'bg-purple-100 text-purple-700';
        case DealType.LAST_MINUTE: return 'bg-red-100 text-red-700';
        case DealType.HAPPY_HOUR: return 'bg-orange-100 text-orange-700';
        case DealType.LUNCH: return 'bg-blue-100 text-blue-700';
        default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleVoteClick = (e: React.MouseEvent, direction: number) => {
    e.stopPropagation(); // Prevent card click
    onVote(deal, direction);
  };

  const userVote = deal.userVote || 0;

  return (
    <div
      onClick={() => onClick(deal)}
      className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} rounded-xl shadow-sm border overflow-hidden active:scale-[0.98] transition-transform duration-200 cursor-pointer mb-4`}
    >
      <div className="relative h-32 w-full" style={{ background: 'linear-gradient(135deg, #fed7aa, #fdba74)' }}>
        <img
          src={deal.imageUrl}
          alt={deal.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-lg font-bold text-sm shadow-md flex items-center gap-1">
          <span className="text-gray-400 line-through text-xs">
            {deal.originalPrice?.toFixed(2)}{deal.currency}
          </span>
          <span className="text-green-600">
            {deal.price.toFixed(2)}{deal.currency}
          </span>
        </div>
        {discount > 0 && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                -{discount}%
            </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} line-clamp-1`}>{deal.title}</h3>
          {deal.verified && <CheckCircle size={16} className="text-blue-500 flex-shrink-0" />}
        </div>

        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'} mb-2 line-clamp-1`}>{deal.restaurantName}</p>
        
        <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getTypeColor(deal.dealType)}`}>
                {deal.dealType}
            </span>
            <div className="flex items-center text-xs text-gray-400 gap-1">
                <MapPin size={12} />
                <span>{deal.distance || t('distance')}</span>
            </div>
        </div>

        <div className={`flex justify-between items-center text-xs ${isDark ? 'text-slate-400 border-slate-700' : 'text-gray-500 border-gray-100'} border-t pt-3`}>
            <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{t('ends')} {new Date(deal.validUntil).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>

            {/* Voting Mechanism */}
            <div className={`flex items-center gap-1 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'} rounded-lg border p-1`}>
                <button
                    onClick={(e) => handleVoteClick(e, 1)}
                    className={`p-1 rounded transition-colors ${userVote === 1 ? 'text-orange-600 bg-orange-50' : isDark ? 'text-slate-400 hover:bg-slate-600' : 'text-gray-400 hover:bg-gray-200'}`}
                >
                    <ArrowBigUp size={16} fill={userVote === 1 ? "currentColor" : "none"} />
                </button>
                <span className={`font-bold min-w-[20px] text-center ${userVote === 1 ? 'text-orange-600' : userVote === -1 ? 'text-blue-600' : isDark ? 'text-white' : 'text-gray-700'}`}>
                    {deal.votes}
                </span>
                <button
                    onClick={(e) => handleVoteClick(e, -1)}
                    className={`p-1 rounded transition-colors ${userVote === -1 ? 'text-blue-600 bg-blue-50' : isDark ? 'text-slate-400 hover:bg-slate-600' : 'text-gray-400 hover:bg-gray-200'}`}
                >
                    <ArrowBigDown size={16} fill={userVote === -1 ? "currentColor" : "none"} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};