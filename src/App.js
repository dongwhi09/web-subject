import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, X, Send, Moon, Sun, Bot } from 'lucide-react';

const CalendarApp = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ 
    title: '', 
    date: new Date().toISOString().split('T')[0], // 오늘 날짜로 초기화
    time: null, // 시간은 선택사항으로 null로 초기화
    description: '' 
  });
  const [addFormError, setAddFormError] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAiLoading, ] = useState(false);

  // Load schedules from localStorage into initial state
  const savedSchedules = localStorage.getItem('schedules');
  const initialSchedules = savedSchedules ? JSON.parse(savedSchedules) : [];
  const [schedules, setSchedules] = useState(initialSchedules);

  // This useEffect is no longer needed since we load schedules in initial state
  useEffect(() => {
    // No longer needed
  }, []);

  useEffect(() => {
    localStorage.setItem('schedules', JSON.stringify(schedules));
  }, [schedules]);

  // OpenAI API 호출 함수
  // OpenAI API 호출 함수 추가
const callOpenAI = async (prompt) => {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  if (!apiKey) {
    return { error: "OpenAI API Key가 환경변수에 설정되어 있지 않습니다." };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "너는 한국어로 일정 관리 도우미야. 사용자가 자연어로 일정을 추가, 조회, 삭제하면, 날짜(date:YYYY-MM-DD), 행동(action:add|query|delete), 내용(content, 옵션)을 JSON으로 반환해. 예시: {\"action\":\"add\",\"date\":\"2025-07-05\",\"content\":\"친구 만나기\"}, {\"action\":\"query\",\"date\":\"2025-07-05\"}, {\"action\":\"delete\",\"date\":\"2025-07-05\",\"content\":\"친구 만나기\"} 또는 {\"action\":\"delete\",\"date\":\"2025-07-05\"}" },
          { role: "user", content: prompt },
        ],
        max_tokens: 128,
        temperature: 0.2,
      }),
    });
    const data = await response.json();
    
    // 답변에서 JSON 파싱
    const text = data.choices[0].message.content.match(/\{[\s\S]*\}/)[0];
    return JSON.parse(text);
  } catch (error) {
    return { error: "AI가 명령을 이해하지 못했어요. 다시 시도해 주세요." };
  }
};

const processCommand = async (message) => {
  const parsed = await callOpenAI(message);
  
  if (parsed.error) {
    return parsed.error;
  }

  const targetDate = parsed.date ? new Date(parsed.date) : selectedDate;
  
  if (parsed.action === "add") {
    const newSched = {
      id: Date.now(),
      date: targetDate.toDateString(),
      title: parsed.content,
      time: '09:00',
      description: '',
      completed: false
    };
    setSchedules([...schedules, newSched]);
    return `${parsed.date || formatDate(selectedDate)}에 '${parsed.content}' 일정이 추가되었습니다.`;
    
  } else if (parsed.action === "query") {
    const targetSchedules = schedules.filter(s => s.date === targetDate.toDateString());
    if (targetSchedules.length > 0) {
      return `${parsed.date || formatDate(selectedDate)} 일정:\n${targetSchedules.map(s => 
        `• ${s.title} ${s.time} ${s.completed ? '✓' : ''}`
      ).join('\n')}`;
    } else {
      return `${parsed.date || formatDate(selectedDate)}에는 일정이 없습니다.`;
    }
    
  } else if (parsed.action === "delete") {
    if (parsed.content) {
      return `${parsed.date || formatDate(selectedDate)}의 '${parsed.content}' 관련 일정이 삭제되었습니다.`;
    } else {
      // 해당 날짜의 모든 일정 삭제
      setSchedules(schedules.filter(s => s.date !== targetDate.toDateString()));
      return `${parsed.date || formatDate(selectedDate)}의 모든 일정이 삭제되었습니다.`;
    }
  } else {
    return "알 수 없는 명령입니다.";
  }
};

  // 달력 렌더링을 위한 함수들
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateFull = (date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  // 일정 관리 함수들
  const addSchedule = (schedule, targetDate = null) => {
    // targetDate가 있으면 사용하고, 없으면 schedule.date 또는 selectedDate 사용
    let scheduleDate;
    if (targetDate) {
      scheduleDate = targetDate;
    } else if (schedule.date) {
      scheduleDate = new Date(schedule.date);
    } else {
      scheduleDate = selectedDate;
    }
    
    const newSched = {
      id: Date.now(),
      date: scheduleDate.toDateString(),
      title: schedule.title,
      time: schedule.time,
      description: schedule.description || '',
      completed: false
    };
    setSchedules(prevSchedules => [...prevSchedules, newSched]);
    setNewSchedule({ 
      title: '', 
      date: new Date().toISOString().split('T')[0], 
      time: '09:00', 
      description: '' 
    });
    setShowAddForm(false);
    return newSched;
  };

  const toggleScheduleComplete = (id) => {
    setSchedules(prevSchedules => prevSchedules.map(s => 
      s.id === id ? { ...s, completed: !s.completed } : s
    ));
  };

  const deleteSchedule = (id) => {
    setSchedules(prevSchedules => prevSchedules.filter(s => s.id !== id));
  };

  const getSchedulesForDate = (date) => {
    return schedules.filter(s => s.date === date.toDateString());
  };

  // 채팅 제출 처리
  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || loading) return;
  
    setLoading(true);
    const userMessage = { type: 'user', message: chatMessage };
    setChatHistory(prev => [...prev, userMessage]);
    
    const response = await processCommand(chatMessage);
    const botMessage = { type: 'bot', message: response };
    
    setChatHistory(prev => [...prev, botMessage]);
    setChatMessage('');
    setLoading(false);
  };

  // 미리 정의된 시간 옵션들
  const timeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  // 달력 렌더링
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // 빈 칸 추가
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }

    // 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const hasSchedules = getSchedulesForDate(date).length > 0;
      const isSelected = isSameDay(date, selectedDate);
      const isToday = isSameDay(date, new Date());

      let dayClasses = "h-12 flex items-center justify-center cursor-pointer transition-all duration-150 relative font-medium";
      
      if (isSelected) {
        dayClasses += isDarkMode ? " bg-white text-black rounded-full" : " bg-black text-white rounded-full";
      } else if (isToday) {
        dayClasses += isDarkMode ? " text-white" : " text-black";
      } else {
        dayClasses += isDarkMode ? " text-gray-400 hover:text-white" : " text-gray-400 hover:text-black";
      }

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={dayClasses}
        >
          {day}
          {hasSchedules && (
            <div className={`absolute bottom-1 w-1 h-1 rounded-full ${
              isSelected 
                ? (isDarkMode ? 'bg-black' : 'bg-white')
                : (isDarkMode ? 'bg-white' : 'bg-black')
            }`}></div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <div className="max-w-6xl mx-auto p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light tracking-tight">AI Calendar</h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatDateFull(selectedDate)}
            </p>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* 달력 */}
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-light">
                {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={day + index} className={`text-center text-sm py-3 font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* 사이드바 */}
          <div className="col-span-4 space-y-6">
            {/* 일정 목록 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-light">Events</h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  <Plus size={18} />
                </button>
              </div>

              {showAddForm && (
                <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <input
                    type="text"
                    placeholder="Event title"
                    value={newSchedule.title}
                    onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
                    className={`w-full p-3 rounded-lg border-0 text-sm mb-3 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-black text-white placeholder-gray-500' 
                        : 'bg-white text-black placeholder-gray-400'
                    }`}
                  />
                  
                  {/* 날짜 선택 */}
                  <input
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                    className={`w-full p-3 rounded-lg border-0 text-sm mb-3 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black'
                    }`}
                  />
                  
                  {/* 시간 선택 드롭다운 */}
                  <select
                    value={newSchedule.time || ''}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                    className={`w-full p-3 rounded-lg border-0 text-sm mb-3 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black'
                    }`}
                  >
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!newSchedule.title.trim()) {
                          setAddFormError('일정 제목을 입력해주세요');
                          return;
                        }
                        setAddFormError('');
                        addSchedule(newSchedule);
                      }}
                      className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                        isDarkMode 
                          ? 'bg-white text-black hover:bg-gray-200' 
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {addFormError && (
                <div className={`text-red-500 text-sm mt-2 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                  {addFormError}
                </div>
              )}

              <div className="space-y-2">
                {getSchedulesForDate(selectedDate).map(schedule => (
                  <div
                    key={schedule.id}
                    className={`p-3 rounded-lg transition-all ${
                      schedule.completed 
                        ? (isDarkMode ? 'bg-gray-900 opacity-60' : 'bg-gray-50 opacity-60')
                        : (isDarkMode ? 'bg-gray-900' : 'bg-gray-50')
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className={`font-medium ${schedule.completed ? 'line-through' : ''}`}>
                          {schedule.title}
                        </h4>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {schedule.time ? schedule.time : 'All Day'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleScheduleComplete(schedule.id)}
                          className={`p-1 rounded transition-colors ${
                            schedule.completed 
                              ? 'text-green-500' 
                              : isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
                          }`}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => deleteSchedule(schedule.id)}
                          className={`p-1 rounded transition-colors ${
                            isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {getSchedulesForDate(selectedDate).length === 0 && (
                  <p className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No events today
                  </p>
                )}
              </div>
            </div>

            {/* AI 채팅 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bot size={18} className="text-blue-500" />
                <h3 className="text-lg font-light">AI Assistant</h3>
              </div>

              <div className={`h-40 overflow-y-auto mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {chatHistory.length === 0 ? (
                  <div className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <p className="mb-2">💡 AI로 일정을 관리해보세요!</p>
                    <p className="text-xs">예시:</p>
                    <p className="text-xs">• "내일 3시에 회의 일정 추가해줘"</p>
                    <p className="text-xs">• "다음 주 화요일 발표 준비"</p>
                    <p className="text-xs">• "오늘 일정 알려줘"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          chat.type === 'user' 
                            ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100')
                            : (isDarkMode ? 'bg-gray-900' : 'bg-gray-50')
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {chat.type === 'user' ? (
                            <div className={`w-6 h-6 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
                          ) : (
                            <Bot size={16} className="text-blue-500" />
                          )}
                          <p className={`text-sm ${
                            chat.type === 'user' ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                          }`}>
                            {chat.message}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isAiLoading && (
                      <div className={`text-sm p-2 rounded max-w-[85%] ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-l-2 border-blue-500`}>
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                          <span>AI가 생각중...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="AI에게 일정 관리를 요청해보세요..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isAiLoading && handleChatSubmit()}
                  disabled={isAiLoading}
                  className={`flex-1 p-3 rounded-lg border-0 text-sm focus:outline-none ${
                    isDarkMode 
                      ? 'bg-gray-900 text-white placeholder-gray-500' 
                      : 'bg-gray-100 text-black placeholder-gray-400'
                  } ${isAiLoading ? 'opacity-50' : ''}`}
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={loading || !chatMessage.trim()}
                  className={`p-3 rounded-lg transition-colors ${
                    loading || !chatMessage.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  } ${
                    isDarkMode 
                      ? 'bg-white text-black hover:bg-gray-200' 
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                  >
                  {loading ? '...' : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarApp;