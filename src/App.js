import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, X, Send, Moon, Sun, Bot } from 'lucide-react';

const CalendarApp = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ 
    title: '', 
    date: new Date().toISOString().split('T')[0],
    time: null, // All day로 기본 설정
    description: '' 
  });
  const [addFormError, setAddFormError] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  
  // 로컬 스토리지에서 다크모드 설정 불러오기
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('ai-calendar-theme');
      return savedTheme === 'dark';
    } catch (error) {
      return false;
    }
  });
  
  const [loading, setLoading] = useState(false);
  
  // 로컬 스토리지에서 일정 불러오기
  const [schedules, setSchedules] = useState(() => {
    try {
      const savedSchedules = localStorage.getItem('ai-calendar-schedules');
      return savedSchedules ? JSON.parse(savedSchedules) : [];
    } catch (error) {
      console.error('Failed to load schedules from localStorage:', error);
      return [];
    }
  });

  // 일정이 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    try {
      localStorage.setItem('ai-calendar-schedules', JSON.stringify(schedules));
    } catch (error) {
      console.error('Failed to save schedules to localStorage:', error);
    }
  }, [schedules]);

  // 다크모드 설정이 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    try {
      localStorage.setItem('ai-calendar-theme', isDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }, [isDarkMode]);

  // 현재 날짜를 YYYY-MM-DD 형식으로 반환
  const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 날짜 문자열을 Date 객체로 안전하게 변환
  const parseDate = (dateString) => {
    if (!dateString) return new Date();
    
    // YYYY-MM-DD 형식 확인
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return new Date();
    }
    
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // AI 응답을 시뮬레이션하는 함수 (실제 OpenAI API 대신)
  const simulateAI = async (prompt) => {
    // 간단한 패턴 매칭으로 AI 응답 시뮬레이션
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const lowerPrompt = prompt.toLowerCase();
    
    // 시간 패턴 추출 (예: "3시", "오후 2시", "14:00" 등)
    const timePatterns = [
      /(\d{1,2})시(?:\s*(\d{1,2})분)?/,  // "3시", "3시 30분"
      /오전\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/,  // "오전 9시"
      /오후\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/,  // "오후 3시"
      /(\d{1,2}):(\d{2})/  // "14:30"
    ];
    
    let extractedTime = null;
    
    for (const pattern of timePatterns) {
      const match = lowerPrompt.match(pattern);
      if (match) {
        let hour = parseInt(match[1]);
        let minute = match[2] ? parseInt(match[2]) : 0;
        
        // 오후 처리
        if (lowerPrompt.includes('오후') && hour < 12) {
          hour += 12;
        }
        
        // 시간 형식으로 변환
        extractedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        break;
      }
    }
    
    if (lowerPrompt.includes('내일') && lowerPrompt.includes('추가')) {
      const content = prompt.replace(/내일|추가해줘|추가|일정|\d{1,2}시|\d{1,2}:\d{2}|오전|오후|\d{1,2}분/g, '').trim();
      return {
        action: 'add',
        date: formatDateToString(tomorrow),
        content: content || '새 일정',
        time: extractedTime // 시간이 명시되지 않으면 null (All day)
      };
    }
    
    if (lowerPrompt.includes('오늘') && lowerPrompt.includes('추가')) {
      const content = prompt.replace(/오늘|추가해줘|추가|일정|\d{1,2}시|\d{1,2}:\d{2}|오전|오후|\d{1,2}분/g, '').trim();
      return {
        action: 'add',
        date: formatDateToString(today),
        content: content || '새 일정',
        time: extractedTime
      };
    }
    
    if (lowerPrompt.includes('일정') && lowerPrompt.includes('추가')) {
      const content = prompt.replace(/추가해줘|추가|일정|\d{1,2}시|\d{1,2}:\d{2}|오전|오후|\d{1,2}분/g, '').trim();
      return {
        action: 'add',
        date: formatDateToString(selectedDate),
        content: content || '새 일정',
        time: extractedTime
      };
    }
    
    if (lowerPrompt.includes('오늘') && (lowerPrompt.includes('알려') || lowerPrompt.includes('조회'))) {
      return {
        action: 'query',
        date: formatDateToString(today)
      };
    }
    
    if (lowerPrompt.includes('내일') && (lowerPrompt.includes('알려') || lowerPrompt.includes('조회'))) {
      return {
        action: 'query',
        date: formatDateToString(tomorrow)
      };
    }
    
    if (lowerPrompt.includes('삭제')) {
      return {
        action: 'delete',
        date: formatDateToString(selectedDate),
        content: prompt.replace(/삭제|해줘/g, '').trim()
      };
    }
    
    return { error: "명령을 이해하지 못했습니다. 다시 시도해주세요." };
  };

  const processCommand = async (message) => {
    const parsed = await simulateAI(message);
    
    if (parsed.error) {
      return parsed.error;
    }

    const targetDate = parsed.date ? parseDate(parsed.date) : selectedDate;
    
    if (parsed.action === "add") {
      const newSched = {
        id: Date.now(),
        date: targetDate.toDateString(),
        title: parsed.content,
        time: parsed.time || null, // 시간이 없으면 null (All day)
        description: '',
        completed: false
      };
      setSchedules(prev => [...prev, newSched]);
      const timeInfo = parsed.time ? `${parsed.time}에` : '';
      return `${formatDateFull(targetDate)} ${timeInfo} '${parsed.content}' 일정이 추가되었습니다.`;
      
    } else if (parsed.action === "query") {
      const targetSchedules = schedules.filter(s => s.date === targetDate.toDateString());
      if (targetSchedules.length > 0) {
        return `${formatDateFull(targetDate)} 일정:\n${targetSchedules.map(s => 
          `• ${s.title} ${s.time} ${s.completed ? '✓' : ''}`
        ).join('\n')}`;
      } else {
        return `${formatDateFull(targetDate)}에는 일정이 없습니다.`;
      }
      
    } else if (parsed.action === "delete") {
      if (parsed.content) {
        const filteredSchedules = schedules.filter(s => 
          s.date !== targetDate.toDateString() || 
          !s.title.toLowerCase().includes(parsed.content.toLowerCase())
        );
        setSchedules(filteredSchedules);
        return `${formatDateFull(targetDate)}의 '${parsed.content}' 관련 일정이 삭제되었습니다.`;
      } else {
        setSchedules(schedules.filter(s => s.date !== targetDate.toDateString()));
        return `${formatDateFull(targetDate)}의 모든 일정이 삭제되었습니다.`;
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
  const addSchedule = (schedule) => {
    const scheduleDate = schedule.date ? parseDate(schedule.date) : selectedDate;
    
    const newSched = {
      id: Date.now(),
      date: scheduleDate.toDateString(),
      title: schedule.title,
      time: schedule.time || null, // null이면 All day
      description: schedule.description || '',
      completed: false
    };
    setSchedules(prevSchedules => [...prevSchedules, newSched]);
    setNewSchedule({ 
      title: '', 
      date: new Date().toISOString().split('T')[0], 
      time: null, // All day로 초기화
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
                  
                  <select
                    value={newSchedule.time || ''}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value || null})}
                    className={`w-full p-3 rounded-lg border-0 text-sm mb-3 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black'
                    }`}
                  >
                    <option value="">All Day</option>
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
                <div className="text-red-500 text-sm mt-2">
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
                    <p className="text-xs">• "내일 오후 3시에 회의 일정 추가해줘"</p>
                    <p className="text-xs">• "오늘 발표 준비 추가"</p>
                    <p className="text-xs">• "오늘 일정 알려줘"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${
                          chat.type === 'user' 
                            ? (isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black')
                            : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-gray-700')
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {chat.type === 'bot' && <Bot size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />}
                          <div className="whitespace-pre-line">{chat.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="AI에게 일정 관리를 요청해보세요..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleChatSubmit()}
                  disabled={loading}
                  className={`flex-1 p-3 rounded-lg border-0 text-sm focus:outline-none ${
                    isDarkMode 
                      ? 'bg-gray-900 text-white placeholder-gray-500' 
                      : 'bg-gray-100 text-black placeholder-gray-400'
                  } ${loading ? 'opacity-50' : ''}`}
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