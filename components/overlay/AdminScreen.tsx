import React, { useState, useEffect } from 'react';
import { Shield, Database, Coins, ArrowLeft, RefreshCw, Layers, PlayCircle, Clock, History, Zap, Bell, Package, User, Check, X } from 'lucide-react';
import { ethers } from 'ethers';
import { 
    CHH_TOKEN_ADDRESS, 
    SCORE_VAULT_ADDRESS, 
    BONUS_CONTRACT_ADDRESS, 
    SHOP_CONTRACT_ADDRESS, 
    ERC20_ABI, 
    BASE_RPC_URL 
} from '../../services/contracts/contractUtils';
import { fetchAdminTableData } from '../../services/supabase';

interface AdminScreenProps {
    onBack: () => void;
}

const CONTRACTS = [
    { name: "スコアボールト (Score Vault)", address: SCORE_VAULT_ADDRESS, role: "報酬支払 (スコア × 0.05)" },
    { name: "ボーナスプール (Bonus Pool)", address: BONUS_CONTRACT_ADDRESS, role: "デイリーボーナス (100 CHH)" },
    { name: "ショップボールト (Shop Vault)", address: SHOP_CONTRACT_ADDRESS, role: "アイテム売上収益" },
    { name: "トークンコントラクト", address: CHH_TOKEN_ADDRESS, role: "ERC20 トークン管理" }
];

const DB_TABLES = [
    { name: "スコア履歴", id: "scores" },
    { name: "プレイヤー情報", id: "player_stats" },
    { name: "所持アイテム", id: "player_items" }
];

const ANALYTIC_TABS = [
    { id: 'play_counts', label: 'プレイ回数', icon: <PlayCircle size={14}/> },
    { id: 'active_info', label: 'アクティブ情報', icon: <Clock size={14}/> },
    { id: 'score_history', label: 'スコア履歴', icon: <History size={14}/> },
    { id: 'stamina_info', label: 'スタミナ情報', icon: <Zap size={14}/> },
    { id: 'notifications', label: '通知設定', icon: <Bell size={14}/> },
    { id: 'items', label: 'アイテム所持数', icon: <Package size={14}/> },
];

export const AdminScreen: React.FC<AdminScreenProps> = ({ onBack }) => {
    const [balances, setBalances] = useState<Record<string, string>>({});
    const [loadingBalances, setLoadingBalances] = useState(false);
    
    // Analytics State
    const [activeAnalyticTab, setActiveAnalyticTab] = useState("play_counts");
    const [analyticData, setAnalyticData] = useState<any[]>([]);
    const [loadingAnalytic, setLoadingAnalytic] = useState(false);

    // DB Inspector State
    const [activeTable, setActiveTable] = useState<string>("scores");
    const [tableData, setTableData] = useState<any[]>([]);
    const [loadingTable, setLoadingTable] = useState(false);

    // Fetch Balances
    const fetchBalances = async () => {
        setLoadingBalances(true);
        try {
            const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
            const tokenContract = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, provider);
            
            const newBalances: Record<string, string> = {};
            
            for (const c of CONTRACTS) {
                if (c.name === "トークンコントラクト") continue; // Token contract doesn't hold itself usually, logic varies
                const bal = await tokenContract.balanceOf(c.address);
                newBalances[c.address] = ethers.formatUnits(bal, 18);
            }
            setBalances(newBalances);
        } catch (e) {
            console.error("Failed to fetch balances", e);
        } finally {
            setLoadingBalances(false);
        }
    };

    // Fetch Analytics Data
    const fetchAnalytics = async (tab: string) => {
        setLoadingAnalytic(true);
        try {
            let data: any[] = [];
            if (tab === 'play_counts' || tab === 'active_info' || tab === 'stamina_info' || tab === 'notifications') {
                const res = await fetchAdminTableData('player_stats');
                if (tab === 'play_counts') {
                    data = res.sort((a, b) => (b.run_count || 0) - (a.run_count || 0));
                } else {
                    // Default sort by last_active descending
                    data = res.sort((a, b) => new Date(b.last_active || 0).getTime() - new Date(a.last_active || 0).getTime());
                }
            } else if (tab === 'score_history') {
                 const res = await fetchAdminTableData('scores');
                 data = res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            } else if (tab === 'items') {
                 const itemsRes = await fetchAdminTableData('player_items');
                 const statsRes = await fetchAdminTableData('player_stats');
                 data = itemsRes.map(item => {
                     const user = statsRes.find(s => s.user_id === item.user_id);
                     return { ...item, user };
                 });
            }
            setAnalyticData(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAnalytic(false);
        }
    };

    // Fetch Table Data
    const fetchTable = async (tableName: string) => {
        setLoadingTable(true);
        setActiveTable(tableName);
        const data = await fetchAdminTableData(tableName);
        setTableData(data);
        setLoadingTable(false);
    };

    useEffect(() => {
        fetchBalances();
        fetchTable(activeTable);
    }, []);

    useEffect(() => {
        fetchAnalytics(activeAnalyticTab);
    }, [activeAnalyticTab]);

    const formatDateJST = (isoString: string | null) => {
        if (!isoString) return '---';
        return new Date(isoString).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    };

    const renderUserCell = (row: any, isItemRow = false) => {
        const user = isItemRow ? row.user : row;
        const pfp = user?.pfp_url;
        const name = user?.display_name || user?.username || (isItemRow ? row.user_id : 'Unknown');
        
        return (
            <div className="flex items-center gap-2">
                {pfp ? (
                    <img src={pfp} alt="pfp" className="w-6 h-6 rounded-full border border-gray-600" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                        <User size={12} className="text-gray-400" />
                    </div>
                )}
                <span className="truncate max-w-[120px]" title={name}>{name}</span>
            </div>
        );
    };

    return (
        <div className="absolute inset-0 flex flex-col bg-gray-900 text-white z-[100] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 shadow-md">
                <div className="flex items-center gap-2">
                    <Shield className="text-red-500" />
                    <h1 className="text-xl font-bold font-mono text-red-400">管理コンソール (ADMIN)</h1>
                </div>
                <button onClick={onBack} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                    <ArrowLeft />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                
                {/* Section 1: Contracts */}
                <section className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-yellow-400">
                            <Coins size={20} /> コントラクト残高 (Base Mainnet)
                        </h2>
                        <button onClick={fetchBalances} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                            <RefreshCw size={16} className={loadingBalances ? "animate-spin" : ""} />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CONTRACTS.map((c) => (
                            <div key={c.address} className="bg-gray-900 p-4 rounded-xl border border-gray-700 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-blue-400">{c.name}</span>
                                    <span className="text-[10px] bg-gray-700 px-2 py-1 rounded text-gray-300">{c.role}</span>
                                </div>
                                <div className="font-mono text-[10px] text-gray-500 break-all mb-2">{c.address}</div>
                                <div className="mt-auto flex justify-between items-end border-t border-gray-800 pt-2">
                                    <span className="text-xs text-gray-400">保有残高:</span>
                                    <span className="text-xl font-mono font-bold text-green-400">
                                        {c.name === "トークンコントラクト" ? "N/A" : (balances[c.address] ? Number(balances[c.address]).toLocaleString() : "---")}
                                        <span className="text-xs text-green-700 ml-1">CHH</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 2: Player Analytics (NEW) */}
                <section className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 shadow-lg min-h-[400px] flex flex-col">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Database size={20} className="text-green-400" />
                            <h2 className="text-lg font-bold text-green-400">プレイヤー分析 (Analytics)</h2>
                        </div>
                        <button onClick={() => fetchAnalytics(activeAnalyticTab)} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                            <RefreshCw size={16} className={loadingAnalytic ? "animate-spin" : ""} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600">
                        {ANALYTIC_TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveAnalyticTab(t.id)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeAnalyticTab === t.id ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Table Content */}
                    <div className="flex-1 overflow-auto bg-gray-900 rounded-xl border border-gray-700 relative">
                        {loadingAnalytic && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 backdrop-blur-sm">
                                <RefreshCw className="animate-spin text-green-500" size={32} />
                            </div>
                        )}
                         
                         {analyticData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500 italic text-sm">
                                データがありません。
                            </div>
                         ) : (
                             <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10 font-mono">
                                    <tr>
                                        {/* Dynamic Headers */}
                                        <th className="px-4 py-3 border-b border-gray-700">ユーザー</th>
                                        {activeAnalyticTab === 'play_counts' && <th className="px-4 py-3 border-b border-gray-700">ラン回数</th>}
                                        {activeAnalyticTab === 'active_info' && <th className="px-4 py-3 border-b border-gray-700">最終アクティブ (JST)</th>}
                                        {activeAnalyticTab === 'score_history' && (
                                            <>
                                                <th className="px-4 py-3 border-b border-gray-700 text-right">スコア</th>
                                                <th className="px-4 py-3 border-b border-gray-700">日時 (JST)</th>
                                            </>
                                        )}
                                        {activeAnalyticTab === 'stamina_info' && (
                                            <>
                                                <th className="px-4 py-3 border-b border-gray-700">スタミナ</th>
                                                <th className="px-4 py-3 border-b border-gray-700">最終消費 (JST)</th>
                                                <th className="px-4 py-3 border-b border-gray-700">通知</th>
                                                <th className="px-4 py-3 border-b border-gray-700">最終アクティブ (JST)</th>
                                            </>
                                        )}
                                        {activeAnalyticTab === 'notifications' && <th className="px-4 py-3 border-b border-gray-700">通知設定</th>}
                                        {activeAnalyticTab === 'items' && (
                                            <>
                                                <th className="px-4 py-3 border-b border-gray-700 text-center">Vitality (HP)</th>
                                                <th className="px-4 py-3 border-b border-gray-700 text-center">Recovery</th>
                                                <th className="px-4 py-3 border-b border-gray-700 text-center">Shield</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 font-mono text-gray-300">
                                    {analyticData.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-2 border-r border-gray-800">{renderUserCell(row, activeAnalyticTab === 'items')}</td>
                                            
                                            {activeAnalyticTab === 'play_counts' && (
                                                <td className="px-4 py-2 text-yellow-400 font-bold">{row.run_count}回</td>
                                            )}
                                            
                                            {activeAnalyticTab === 'active_info' && (
                                                <td className="px-4 py-2">{formatDateJST(row.last_active)}</td>
                                            )}
                                            
                                            {activeAnalyticTab === 'score_history' && (
                                                <>
                                                    <td className="px-4 py-2 text-right text-blue-400 font-bold">{Number(row.score).toLocaleString()}</td>
                                                    <td className="px-4 py-2">{formatDateJST(row.created_at)}</td>
                                                </>
                                            )}
                                            
                                            {activeAnalyticTab === 'stamina_info' && (
                                                <>
                                                    <td className="px-4 py-2 text-center text-yellow-400 font-bold">{row.stamina} / 5</td>
                                                    <td className="px-4 py-2">{formatDateJST(row.last_stamina_update)}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        {row.notification_token ? <Check size={14} className="text-green-500 mx-auto"/> : <span className="text-gray-600">-</span>}
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-500 text-[10px]">{formatDateJST(row.last_active)}</td>
                                                </>
                                            )}

                                            {activeAnalyticTab === 'notifications' && (
                                                <td className="px-4 py-2 flex items-center gap-2">
                                                    {row.notification_token ? (
                                                        <span className="flex items-center gap-1 text-green-400 bg-green-900/30 px-2 py-0.5 rounded text-[10px] border border-green-800">
                                                            <Check size={10} /> ON
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-gray-500 bg-gray-800 px-2 py-0.5 rounded text-[10px] border border-gray-700">
                                                            <X size={10} /> OFF
                                                        </span>
                                                    )}
                                                </td>
                                            )}

                                            {activeAnalyticTab === 'items' && (
                                                <>
                                                    <td className="px-4 py-2 text-center text-red-400 font-bold">{row.max_hp || 0}</td>
                                                    <td className="px-4 py-2 text-center text-pink-400 font-bold">{row.heal || 0}</td>
                                                    <td className="px-4 py-2 text-center text-blue-400 font-bold">{row.shield || 0}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                         )}
                    </div>
                </section>

                {/* Section 3: Database Inspector */}
                <section className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 shadow-lg h-[600px] flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <Database size={20} className="text-purple-400" />
                        <h2 className="text-lg font-bold text-purple-400">データベース参照 (DB Inspector)</h2>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4">
                        {DB_TABLES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => fetchTable(t.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTable === t.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                            >
                                <Layers size={14} /> {t.name}
                            </button>
                        ))}
                    </div>

                    {/* Table View */}
                    <div className="flex-1 overflow-auto bg-gray-900 rounded-xl border border-gray-700 relative">
                        {loadingTable && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 backdrop-blur-sm">
                                <RefreshCw className="animate-spin text-purple-500" size={32} />
                            </div>
                        )}
                        
                        {tableData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500 italic text-sm">
                                データが存在しないか、取得できませんでした。
                            </div>
                        ) : (
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10 font-mono">
                                    <tr>
                                        {Object.keys(tableData[0]).map(key => (
                                            <th key={key} className="px-4 py-3 border-b border-gray-700">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 font-mono text-gray-300">
                                    {tableData.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="px-4 py-2 border-r border-gray-800 last:border-0 max-w-[200px] truncate">
                                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="mt-2 text-[10px] text-gray-500 text-right">
                        最新の100件を表示: {activeTable}
                    </div>
                </section>
            </div>
        </div>
    );
};