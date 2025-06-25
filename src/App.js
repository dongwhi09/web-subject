import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, X, Send, Moon, Sun, Bot } from 'lucide-react';

const CalendarApp = () => {
  // 현재 날짜 상태 관리
  const [currentDate, setCurrentDate] = useState(new Date());
  // 선택된 날짜 상태 관리
  const [selectedDate, setSelectedDate] = useState(new Date());
  // 일정 추가 폼 표시 상태
  const [showAddForm, setShowAddForm] = useState(false);
  // 새로운 일정 입력 상태
  const [newSchedule, setNewSchedule] = useState({ 
    title: '', 
    date: new Date().toISOString().split('T')[0],
    time: null,
    description: '' 
  });
  // 일정 추가 폼 에러 메시지
  const [addFormError, setAddFormError] = useState('');
  // 채팅 메시지 상태
  const [chatMessage, setChatMessage] = useState('');
  // 채팅 이력 상태
  const [chatHistory, setChatHistory] = useState([]);
  // 다크모드 상태
  const [isDarkMode, setIsDarkMode] = useState(false);
  // 로딩 상태
  const [loading, setLoading] = useState(false);
  // 일정 목록 상태
  const [schedules, setSchedules] = useState([]);

  // 날짜를 YYYY-MM-DD 형식의 문자열로 변환
const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 문자열로 된 날짜를 Date 객체로 파싱
const parseDate = (dateString) => {
    if (!dateString) return new Date();
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return new Date();
    }
    
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // 채팅 명령어 처리 함수
const processCommand = async (message) => {
    // API 호출 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lowerMessage = message.toLowerCase();
    
    // 명령어 파싱
    if (lowerMessage.includes('추가') || lowerMessage.includes('일정')) {
      let targetDate = selectedDate;
      let title = message;
      let time = null;
      
      if (lowerMessage.includes('내일')) {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
      } else if (lowerMessage.includes('오늘')) {
        targetDate = new Date();
      }
      
      const timeMatch = message.match(/(\d{1,2})시|(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        if (timeMatch[1]) {
          time = `${timeMatch[1].padStart(2, '0')}:00`;
        } else if (timeMatch[2] && timeMatch[3]) {
          time = `${timeMatch[2].padStart(2, '0')}:${timeMatch[3]}`;
        }
      }
      
      // Extract title
      title = message.replace(/내일|오늘|\d{1,2}시|\d{1,2}:\d{2}|에|추가해줘|일정/g, '').trim();
      if (!title) title = '새 일정';
      
      const dateString = formatDateToString(targetDate);
      const newSched = {
        id: Date.now(),
        date: dateString,
        title: title,
        time: time,
        description: '',
        completed: false
      };
      setSchedules(prev => [...prev, newSched]);
      return `${formatDateFull(targetDate)}에 '${title}' 일정이 추가되었습니다.`;
      
    } else if (lowerMessage.includes('조회') || lowerMessage.includes('알려')) {
      let targetDate = selectedDate;
      
      if (lowerMessage.includes('내일')) {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
      } else if (lowerMessage.includes('오늘')) {
        targetDate = new Date();
      }
      
      const dateString = formatDateToString(targetDate);
      const targetSchedules = schedules.filter(s => s.date === dateString);
      
      if (targetSchedules.length > 0) {
        const scheduleList = targetSchedules.map(s => 
          `• ${s.title} ${s.time ? `(${s.time})` : '(하루 종일)'} ${s.completed ? '✓' : ''}`
        ).join('\n');
        return `${formatDateFull(targetDate)} 일정:\n${scheduleList}`;
      } else {
        return `${formatDateFull(targetDate)}에는 일정이 없습니다.`;
      }
      
    } else if (lowerMessage.includes('삭제')) {
      let targetDate = selectedDate;
      
      if (lowerMessage.includes('내일')) {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
      } else if (lowerMessage.includes('오늘')) {
        targetDate = new Date();
      }
      
      const dateString = formatDateToString(targetDate);
      const beforeCount = schedules.length;
      setSchedules(schedules.filter(s => s.date !== dateString));
      const deletedCount = beforeCount - schedules.filter(s => s.date !== dateString).length;
      
      if (deletedCount > 0) {
        return `${formatDateFull(targetDate)}의 일정 ${deletedCount}개가 삭제되었습니다.`;
      } else {
        return `${formatDateFull(targetDate)}에는 삭제할 일정이 없습니다.`;
      }
    }
    
    return "명령을 이해하지 못했습니다. '일정 추가', '일정 조회', '일정 삭제' 등의 명령을 사용해보세요.";
  };

  // 해당 월의 일수를 반환
const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // 해당 월의 첫 번째 날짜의 요일을 반환
const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // 날짜를 한국어 형식으로 포맷팅
const formatDateFull = (date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 두 날짜가 같은 날짜인지 확인
const isSameDay = (date1, date2) => {
    return formatDateToString(date1) === formatDateToString(date2);
  };

  // 새로운 일정 추가
const addSchedule = (schedule) => {
    const scheduleDate = schedule.date ? parseDate(schedule.date) : selectedDate;
    const dateString = formatDateToString(scheduleDate);
    
    const newSched = {
      id: Date.now(),
      date: dateString,
      title: schedule.title,
      time: schedule.time || null,
      description: schedule.description || '',
      completed: false
    };

    setSchedules(prevSchedules => [...prevSchedules, newSched]);
    setNewSchedule({ 
      title: '', 
      date: new Date().toISOString().split('T')[0], 
      time: null,
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
    const dateString = formatDateToString(date);
    return schedules.filter(s => s.date === dateString);
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || loading) return;
  
    setLoading(true);
    const userMessage = { type: 'user', message: chatMessage };
    setChatHistory(prev => [...prev, userMessage]);
    
    try {
      const response = await processCommand(chatMessage);
      const botMessage = { type: 'bot', message: response };
      setChatHistory(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { type: 'bot', message: '오류가 발생했습니다. 다시 시도해주세요.' };
      setChatHistory(prev => [...prev, errorMessage]);
    }
    
    setChatMessage('');
    setLoading(false);
  };

  const timeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }

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
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDarkMode ? '#000000' : '#ffffff',
      color: isDarkMode ? '#ffffff' : '#000000',
      transition: 'all 0.3s ease',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '300', letterSpacing: '-0.025em', margin: 0 }}>
              My Schedule
            </h1>
            <p style={{ 
              fontSize: '0.875rem', 
              marginTop: '4px', 
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              margin: '4px 0 0 0'
            }}>
              {formatDateFull(selectedDate)}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                padding: '12px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: isDarkMode ? 'transparent' : 'transparent',
                color: isDarkMode ? '#ffffff' : '#000000',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = isDarkMode ? '#1f2937' : '#f3f4f6'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '300', margin: 0 }}>
                {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  style={{
                    padding: '8px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isDarkMode ? '#ffffff' : '#000000',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    borderRadius: '50px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isDarkMode ? '#ffffff' : '#000000',
                    cursor: 'pointer'
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  style={{
                    padding: '8px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isDarkMode ? '#ffffff' : '#000000',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '16px' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={day + index} style={{ 
                  textAlign: 'center', 
                  fontSize: '0.875rem', 
                  padding: '12px 0', 
                  fontWeight: '500',
                  color: isDarkMode ? '#6b7280' : '#9ca3af'
                }}>
                  {day}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {renderCalendar()}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '300', margin: 0 }}>Events</h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  style={{
                    padding: '8px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isDarkMode ? '#ffffff' : '#000000',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>

              {showAddForm && (
                <div style={{ 
                  marginBottom: '24px', 
                  padding: '16px', 
                  borderRadius: '8px',
                  backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb'
                }}>
                  <input
                    type="text"
                    placeholder="Event title"
                    value={newSchedule.title}
                    onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.875rem',
                      marginBottom: '12px',
                      backgroundColor: isDarkMode ? '#000000' : '#ffffff',
                      color: isDarkMode ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  <input
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.875rem',
                      marginBottom: '12px',
                      backgroundColor: isDarkMode ? '#000000' : '#ffffff',
                      color: isDarkMode ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  <select
                    value={newSchedule.time || ''}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value || null})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.875rem',
                      marginBottom: '12px',
                      backgroundColor: isDarkMode ? '#000000' : '#ffffff',
                      color: isDarkMode ? '#ffffff' : '#000000',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">All Day</option>
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        if (!newSchedule.title.trim()) {
                          setAddFormError('일정 제목을 입력해주세요');
                          return;
                        }
                        setAddFormError('');
                        addSchedule(newSchedule);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        fontSize: '0.875rem',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isDarkMode ? '#ffffff' : '#000000',
                        color: isDarkMode ? '#000000' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.875rem',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: isDarkMode ? '#ffffff' : '#000000',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {addFormError && (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '8px' }}>
                  {addFormError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {getSchedulesForDate(selectedDate).map(schedule => (
                  <div
                    key={schedule.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
                      opacity: schedule.completed ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          fontWeight: '500', 
                          margin: 0,
                          textDecoration: schedule.completed ? 'line-through' : 'none'
                        }}>
                          {schedule.title}
                        </h4>
                        <p style={{ 
                          fontSize: '0.875rem', 
                          marginTop: '4px', 
                          margin: '4px 0 0 0',
                          color: isDarkMode ? '#9ca3af' : '#6b7280'
                        }}>
                          {schedule.time ? schedule.time : '하루 종일'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => toggleScheduleComplete(schedule.id)}
                          style={{
                            padding: '4px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: schedule.completed ? '#10b981' : (isDarkMode ? '#6b7280' : '#9ca3af'),
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => deleteSchedule(schedule.id)}
                          style={{
                            padding: '4px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: isDarkMode ? '#6b7280' : '#9ca3af',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {getSchedulesForDate(selectedDate).length === 0 && (
                  <p style={{ 
                    textAlign: 'center', 
                    padding: '32px 0', 
                    fontSize: '0.875rem',
                    color: isDarkMode ? '#6b7280' : '#9ca3af'
                  }}>
                    No events today
                  </p>
                )}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Bot size={18} style={{ color: '#3b82f6' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '300', margin: 0 }}>AI Assistant</h3>
              </div>

              <div style={{ 
                height: '160px', 
                overflowY: 'auto', 
                marginBottom: '16px', 
                padding: '12px', 
                borderRadius: '8px',
                backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb'
              }}>
                {chatHistory.length === 0 ? (
                  <div style={{ fontSize: '0.875rem', color: isDarkMode ? '#6b7280' : '#9ca3af' }}>
                    <p style={{ marginBottom: '8px' }}>💡 AI로 일정을 관리해보세요!</p>
                    <p style={{ fontSize: '0.75rem', margin: 0 }}>예시:</p>
                    <p style={{ fontSize: '0.75rem', margin: 0 }}>• "내일 오후 3시에 회의 일정 추가해줘"</p>
                    <p style={{ fontSize: '0.75rem', margin: 0 }}>• "오늘 일정 알려줘"</p>
                    <p style={{ fontSize: '0.75rem', margin: 0 }}>• "3일 후에 병원 가기 추가해줘"</p>
                    <p style={{ fontSize: '0.75rem', margin: 0 }}>• "내일 일정 삭제해줘"</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          backgroundColor: chat.type === 'user' 
                            ? (isDarkMode ? '#374151' : '#e5e7eb')
                            : (isDarkMode ? '#4b5563' : '#dbeafe'),
                          color: chat.type === 'user'
                            ? (isDarkMode ? '#ffffff' : '#000000')
                            : (isDarkMode ? '#d1d5db' : '#374151')
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          {chat.type === 'bot' && <Bot size={14} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />}
                          <div style={{ whiteSpace: 'pre-line' }}>{chat.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 채팅 입력 영역 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* 채팅 입력 필드 */}
                <input
                  type="text"
                  placeholder="AI에게 일정 관리를 요청해보세요..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleChatSubmit()}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.875rem',
                    backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                    color: isDarkMode ? '#ffffff' : '#000000',
                    opacity: loading ? 0.5 : 1,
                    boxSizing: 'border-box'
                  }}
                />
                {/* 채팅 전송 버튼 */}
                <button
                  onClick={handleChatSubmit}
                  disabled={loading || !chatMessage.trim()}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isDarkMode ? '#ffffff' : '#000000',
                    color: isDarkMode ? '#000000' : '#ffffff',
                    cursor: loading || !chatMessage.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !chatMessage.trim() ? 0.5 : 1
                  }}
                >
                  {loading ? '...' : <Send size={16} />}  {/* 로딩 중일 때는 ... 표시, 아니면 전송 아이콘 표시 */}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );  // 컴포넌트 렌더링 종료 */
};

export default CalendarApp;