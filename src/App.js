import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, X, MessageCircle, Send, Moon, Sun } from 'lucide-react';

const CalendarApp = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ title: '', time: '', description: '' });
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
  const addSchedule = (schedule) => {
    const newSched = {
      id: Date.now(),
      date: selectedDate.toDateString(),
      ...schedule,
      completed: false
    };
    setSchedules([...schedules, newSched]);
    setNewSchedule({ title: '', time: '', description: '' });
    setShowAddForm(false);
  };

  const toggleScheduleComplete = (id) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, completed: !s.completed } : s
    ));
  };

  const deleteSchedule = (id) => {
    setSchedules(schedules.filter(s => s.id !== id));
  };

  const getSchedulesForDate = (date) => {
    return schedules.filter(s => s.date === date.toDateString());
  };

  // 채팅 함수
  const processCommand = (message) => {
    const lowerMessage = message.toLowerCase();
    let response = '';

    if (lowerMessage.includes('일정 추가') || lowerMessage.includes('약속') || lowerMessage.includes('미팅')) {
      const timeMatch = message.match(/(\d{1,2}):?(\d{0,2})/);
      const titleMatch = message.match(/(미팅|약속|일정|회의)\s*:?\s*(.+?)(?:\s+\d|$)/);
      
      if (titleMatch) {
        const newSched = {
          id: Date.now(),
          date: selectedDate.toDateString(),
          title: titleMatch[2].trim() || '새 일정',
          time: timeMatch ? `${timeMatch[1]}:${timeMatch[2] || '00'}` : '09:00',
          description: '',
          completed: false
        };
        setSchedules([...schedules, newSched]);
        response = `${newSched.title} 일정이 추가되었습니다`;
      } else {
        response = '"일정 추가: 제목" 형태로 입력해주세요';
      }
    } else if (lowerMessage.includes('일정 삭제') || lowerMessage.includes('취소')) {
      const todaySchedules = getSchedulesForDate(selectedDate);
      if (todaySchedules.length > 0) {
        setSchedules(schedules.filter(s => s.date !== selectedDate.toDateString()));
        response = `${formatDate(selectedDate)} 일정이 모두 삭제되었습니다`;
      } else {
        response = '삭제할 일정이 없습니다';
      }
    } else if (lowerMessage.includes('일정') || lowerMessage.includes('오늘') || lowerMessage.includes('스케줄')) {
      const todaySchedules = getSchedulesForDate(selectedDate);
      if (todaySchedules.length > 0) {
        response = `${formatDate(selectedDate)} 일정:\n${todaySchedules.map(s => 
          `• ${s.title} ${s.time} ${s.completed ? '✓' : ''}`
        ).join('\n')}`;
      } else {
        response = `${formatDate(selectedDate)}에는 일정이 없습니다`;
      }
    } else {
      response = '사용 가능한 명령:\n• 일정 추가: 회의 3시\n• 일정 조회\n• 일정 삭제';
    }

    return response;
  };

  const handleChatSubmit = () => {
    if (!chatMessage.trim()) return;

    const userMessage = { type: 'user', message: chatMessage };
    const response = { type: 'bot', message: processCommand(chatMessage) };

    setChatHistory([...chatHistory, userMessage, response]);
    setChatMessage('');
  };

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
            <h1 className="text-3xl font-light tracking-tight">Calendar</h1>
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
                    type="time"
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                    className={`w-full p-3 rounded-lg border-0 text-sm mb-3 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black'
                    }`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => newSchedule.title && addSchedule(newSchedule)}
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
                          {schedule.time}
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

            {/* 채팅 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={18} />
                <h3 className="text-lg font-light">Quick Commands</h3>
              </div>

              <div className={`h-40 overflow-y-auto mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {chatHistory.length === 0 ? (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Try: "일정 추가: 회의 3시"
                  </p>
                ) : (
                  <div className="space-y-2">
                    {chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        className={`text-sm p-2 rounded max-w-[85%] ${
                          chat.type === 'user' 
                            ? `ml-auto ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}` 
                            : `${isDarkMode ? 'bg-gray-800' : 'bg-white'}`
                        }`}
                      >
                        <div className="whitespace-pre-line">{chat.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a command..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                  className={`flex-1 p-3 rounded-lg border-0 text-sm focus:outline-none ${
                    isDarkMode 
                      ? 'bg-gray-900 text-white placeholder-gray-500' 
                      : 'bg-gray-100 text-black placeholder-gray-400'
                  }`}
                />
                <button
                  onClick={handleChatSubmit}
                  className={`p-3 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'bg-white text-black hover:bg-gray-200' 
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  <Send size={16} />
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