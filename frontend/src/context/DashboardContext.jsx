import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, ClipboardList, Users, Truck, User, 
  Plus, Edit2, Trash2, ShieldAlert, CheckCircle2, TrendingUp, IndianRupee, ListFilter, Eye,
  LogOut, Sun, Moon, Bell, HelpCircle, Globe, ChevronDown, ChevronLeft, ChevronRight, Settings, CreditCard, Store, Clock,
  Home, HeartHandshake, Utensils, Hotel, Briefcase, Layers
} from 'lucide-react';
import { logout, toggleSidebar, updateCard, updateUser, switchBusinessSuccess } from '../store/authSlice';
import Modal from '../components/common/Modal';
import { getVendorBackendUrl } from '../services/apiSetup';
import { getBaseVendorType, vendorTaxonomy } from '../data/servicesData';
import { COMPLETE_CAT_TAXONOMY } from '../data/completeTaxonomy';

// Recharts imports for analytics
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const getItemMainCategory = (itemCategory) => {
  if (!itemCategory) return '';
  for (const mainCat of Object.keys(COMPLETE_CAT_TAXONOMY)) {
    for (const subCat of Object.keys(COMPLETE_CAT_TAXONOMY[mainCat])) {
      if (COMPLETE_CAT_TAXONOMY[mainCat][subCat].includes(itemCategory)) {
        return mainCat;
      }
    }
  }
  return '';
};

const getProductMainCategory = (itemCategory, vType) => {
  if (itemCategory && Object.keys(COMPLETE_CAT_TAXONOMY).includes(itemCategory)) {
    return itemCategory;
  }
  const mainFromTax = getItemMainCategory(itemCategory);
  if (mainFromTax) return mainFromTax;

  const type = vType || '';
  if (type.startsWith('Store') || type.startsWith('Electronics') || type.startsWith('Home & Furniture')) {
    return 'Products';
  }
  if (type.startsWith('Grocery') || type.startsWith('Pharmacy')) {
    return 'Daily Needs';
  }
  if (type.startsWith('Restaurant')) {
    return 'Food';
  }
  if (type.startsWith('Hotel')) {
    return 'Stay';
  }
  if (type.startsWith('Job')) {
    return 'Jobs';
  }
  if (type.startsWith('Education')) {
    return 'Education';
  }
  if (type.startsWith('Travel Agency')) {
    return 'Travel';
  }
  if (type.startsWith('Hospital') || type.startsWith('Service')) {
    return 'Services';
  }
  return '';
};

const getFallbackImageUrl = (item, vendorType) => {
  const name = (item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  
  if (vendorType.startsWith('Hospital')) {
    if (name.includes('chen')) return 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=60';
    if (name.includes('watson') || name.includes('emily')) return 'https://images.unsplash.com/photo-1594824813573-246434de83fb?w=500&auto=format&fit=crop&q=60';
    if (name.includes('john') || name.includes('miller') || name.includes('orthopedic')) return 'https://images.unsplash.com/photo-1606318801954-d46d47d3368a?w=500&auto=format&fit=crop&q=60';
    if (name.includes('sophia') || name.includes('davis') || name.includes('dermatologist')) return 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=60';
    if (name.includes('garcia') || name.includes('william') || name.includes('physician')) return 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Education')) {
    if (name.includes('coding') || name.includes('programming') || name.includes('web') || name.includes('software')) return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60';
    if (name.includes('english') || name.includes('language') || name.includes('speaking')) return 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500&auto=format&fit=crop&q=60';
    if (name.includes('math') || name.includes('science') || name.includes('physics')) return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60';
    if (name.includes('design') || name.includes('art') || name.includes('drawing')) return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Job')) {
    if (name.includes('software') || name.includes('developer') || name.includes('engineer')) return 'https://images.unsplash.com/photo-1605379399642-870262d3d051?w=500&auto=format&fit=crop&q=60';
    if (name.includes('marketing') || name.includes('sale') || name.includes('business')) return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60';
    if (name.includes('intern') || name.includes('training')) return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Restaurant')) {
    if (name.includes('margherita') || (name.includes('pizza') && !name.includes('pepperoni'))) return 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=500&auto=format&fit=crop&q=60';
    if (name.includes('pepperoni')) return 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=60';
    if (name.includes('tikka') || name.includes('chicken') || name.includes('masala')) return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=60';
    if (name.includes('tiramisu') || name.includes('dessert')) return 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=60';
    if (name.includes('bread') || name.includes('garlic')) return 'https://images.unsplash.com/photo-1573140401552-3fab0b24306f?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Pharmacy')) {
    if (name.includes('amoxicillin') || name.includes('antibiotic')) return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60';
    if (name.includes('multivitamin') || name.includes('supplement')) return 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&auto=format&fit=crop&q=60';
    if (name.includes('paracetamol') || name.includes('painkiller') || name.includes('pain')) return 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=500&auto=format&fit=crop&q=60';
    if (name.includes('syrup') || name.includes('cough') || name.includes('cold')) return 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?w=500&auto=format&fit=crop&q=60';
    if (name.includes('vitamin c') || name.includes('vitamin')) return 'https://images.unsplash.com/photo-1616679911721-fe6eec10fcd5?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Hotel')) {
    if (name.includes('presidential')) return 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto=format&fit=crop&q=60';
    if (category.includes('deluxe') || name.includes('deluxe')) return 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500&auto=format&fit=crop&q=60';
    if (category.includes('suite') || name.includes('suite')) return 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&auto=format&fit=crop&q=60';
    if (category.includes('family') || name.includes('family')) return 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=500&auto=format&fit=crop&q=60';
    if (category.includes('standard') || name.includes('standard')) return 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1611891405122-45c52143739b?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Service Provider')) {
    if (category.includes('clean') || name.includes('clean')) return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60';
    if (category.includes('plumb') || name.includes('plumb') || name.includes('leak')) return 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500&auto=format&fit=crop&q=60';
    if (category.includes('electrical') || name.includes('electrical') || name.includes('wire') || name.includes('wiring')) return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=60';
    if (category.includes('ac') || category.includes('hvac') || name.includes('ac') || name.includes('conditioner')) return 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=60';
    if (category.includes('salon') || category.includes('spa') || name.includes('massage') || name.includes('spa')) return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=60';
    if (category.includes('paint') || name.includes('paint') || name.includes('painting')) return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&auto=format&fit=crop&q=60';
    if (category.includes('carpentry') || name.includes('carpentry') || name.includes('wood')) return 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&auto=format&fit=crop&q=60';
    if (category.includes('pest') || name.includes('pest')) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60';
    if (category.includes('garden') || name.includes('garden') || name.includes('gardening')) return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&auto=format&fit=crop&q=60';
    if (category.includes('move') || category.includes('moving') || name.includes('move') || name.includes('moving')) return 'https://images.unsplash.com/photo-1603796846097-bee99e4a60c9?w=500&auto=format&fit=crop&q=60';
    if (category.includes('appliance') || name.includes('appliance') || name.includes('repair')) return 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=60';
  } else {
    if (name.includes('wallet') || name.includes('purse')) {
      return 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('shirt') || name.includes('tshirt') || name.includes('clothing') || name.includes('t-shirt') || category.includes('clothing')) {
      return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('earbud') || name.includes('headphone') || name.includes('earphone') || name.includes('audio') || name.includes('sound') || name.includes('wireless') || name.includes('bud')) {
      return 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('watch') || name.includes('smartwatch') || name.includes('chrono')) {
      return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('perfume') || name.includes('fragrance') || name.includes('cologne') || name.includes('scent')) {
      return 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot') || name.includes('footwear')) {
      return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('jacket') || name.includes('coat') || name.includes('hoodie') || name.includes('sweater')) {
      return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('bag') || name.includes('backpack') || name.includes('handbag') || name.includes('luggage')) {
      return 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('phone') || name.includes('mobile') || name.includes('smartphone') || name.includes('iphone')) {
      return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('laptop') || name.includes('computer') || name.includes('pc') || name.includes('macbook')) {
      return 'https://images.unsplash.com/photo-1496181130204-7552cc14b1e0?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('table')) {
      return 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('chair') || name.includes('sofa') || name.includes('desk') || name.includes('furniture') || category.includes('furniture')) {
      return 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('bedsheet') || name.includes('bedding')) {
      return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('mattress') || name.includes('bed')) {
      return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('lamp') || name.includes('light')) {
      return 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('tv') || name.includes('television') || name.includes('led')) {
      return 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('camera')) {
      return 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('router') || name.includes('wifi')) {
      return 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('massage') || name.includes('spa')) {
      return 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('ac ') || name.includes(' air conditioner') || name.includes('hvac')) {
      return 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('rice')) {
      return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('egg')) {
      return 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('oil')) {
      return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('apple')) {
      return 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('bread')) {
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('band') || name.includes('tracker') || name.includes('fitness')) {
      return 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('grocery') || name.includes('food') || name.includes('fresh') || name.includes('fruit') || name.includes('vegetable') || category.includes('grocery') || category.includes('groceries')) {
      return 'https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('mug') || name.includes('cup')) {
      return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('bottle') || name.includes('flask') || name.includes('thermos')) {
      return 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=60';
    }
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';
  }
};

const getItemRating = (item) => {
  const charCodeSum = (item.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rating = (4.0 + (charCodeSum % 10) / 10).toFixed(1);
  const reviewsCount = 10 + (charCodeSum % 190);
  return { rating, reviews: reviewsCount };
};

const getPartnerAvatarUrl = (partner) => {
  const charCodeSum = (partner.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const avatarIndex = (charCodeSum % 5);
  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
  ];
  return avatars[avatarIndex];
};

const getPartnerRating = (partner) => {
  const charCodeSum = (partner.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rating = (4.3 + (charCodeSum % 7) / 10).toFixed(1);
  const reviewsCount = 5 + (charCodeSum % 45);
  return { rating, reviews: reviewsCount };
};

const getCustomerAvatarUrl = (customer) => {
  const charCodeSum = (customer.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const avatarIndex = (charCodeSum % 6);
  const avatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
  ];
  return avatars[avatarIndex];
};

const getCategoryIcon = (category) => {
  const cat = (category || '').toLowerCase();
  
  // Hospital Categories
  if (cat === 'cardiology') return '❤️';
  if (cat === 'pediatrics') return '👶';
  if (cat === 'general') return '🩺';
  if (cat === 'dental') return '🦷';
  if (cat === 'orthopedics') return '🦴';
  if (cat === 'dermatology') return '✨';
  if (cat === 'neurology') return '🧠';
  if (cat === 'gynaecology') return '🤰';
  if (cat === 'oncology') return '🎗️';
  if (cat === 'ent') return '👂';
  if (cat === 'general surgery') return '🔪';

  // Restaurant Categories
  if (cat === 'starters') return '🥗';
  if (cat === 'mains') return '🍲';
  if (cat === 'desserts') return '🍰';
  if (cat === 'beverages') return '🥤';
  if (cat === 'sides') return '🍟';
  if (cat === 'appetizers') return '🍢';
  if (cat === 'soups') return '🥣';
  if (cat === 'salads') return '🥗';
  if (cat === 'breads') return '🥖';
  if (cat === 'kids menu') return '🧸';
  if (cat === 'combos / platters') return '🍱';
  if (cat === 'chef specialties') return '👨‍🍳';

  // Pharmacy Categories
  if (cat === 'painkillers') return '💊';
  if (cat === 'antibiotics') return '🧪';
  if (cat === 'cold & flu') return '🤒';
  if (cat === 'supplements') return '🥤';
  if (cat === 'cardiovascular') return '❤️';
  if (cat === 'diabetic') return '🩸';
  if (cat === 'first aid') return '🩹';
  if (cat === 'skincare') return '🧴';
  if (cat === 'baby care') return '🍼';
  if (cat === 'vitamins') return '🍋';
  if (cat === 'prescription drugs') return '📝';

  // Hotel Categories
  if (cat === 'standard') return '🛏️';
  if (cat === 'deluxe') return '✨';
  if (cat === 'suite') return '🛋️';
  if (cat === 'penthouse') return '🏢';
  if (cat === 'family room') return '👨‍👩‍👧‍👦';
  if (cat === 'executive suite') return '👔';
  if (cat === 'single room') return '👤';
  if (cat === 'double room') return '👥';
  if (cat === 'presidential suite') return '👑';
  if (cat === 'cabana') return '🏖️';

  // Service Provider Categories
  if (cat === 'cleaning') return '🧹';
  if (cat === 'plumbing') return '🔧';
  if (cat === 'electrical') return '⚡';
  if (cat === 'painting') return '🎨';
  if (cat === 'appliance repair') return '⚙️';
  if (cat === 'salon & spa') return '💆';
  if (cat === 'carpentry') return '🪚';
  if (cat === 'pest control') return '🐜';
  if (cat === 'hvac / ac repair') return '❄️';
  if (cat === 'gardening') return '🌱';
  if (cat === 'moving services') return '📦';

  // Education Categories
  if (cat === 'primary education') return '🎒';
  if (cat === 'secondary education') return '🏫';
  if (cat === 'higher education') return '🎓';
  if (cat === 'online courses') return '💻';
  if (cat === 'coaching classes') return '📝';
  if (cat === 'professional training') return '💼';
  if (cat === 'language learning') return '🗣️';
  if (cat === 'certifications') return '📜';
  if (cat === 'arts & music') return '🎨';
  if (cat === 'coding bootcamps') return '💻';
  if (cat === 'test preparation') return '✍️';

  // Job Categories
  if (cat === 'software engineering') return '💻';
  if (cat === 'marketing & sales') return '📈';
  if (cat === 'design & creative') return '🎨';
  if (cat === 'finance & accounts') return '💵';
  if (cat === 'human resources') return '👥';
  if (cat === 'customer support') return '📞';
  if (cat === 'healthcare & medical') return '🩺';
  if (cat === 'management & exec') return '👔';
  if (cat === 'internships') return '🎓';
  if (cat === 'part-time / contract') return '🤝';

  // Store Categories
  if (cat === 'groceries') return '🛒';
  if (cat === 'clothing') return '👕';
  if (cat === 'kitchen') return '🍳';
  if (cat === 'home decor') return '🏺';
  if (cat === 'gadgets') return '🔌';
  if (cat === 'accessories') return '🎒';
  if (cat === 'mobiles') return '📱';
  if (cat === 'hardware') return '🔨';
  if (cat === 'fresh produce') return '🥦';
  if (cat === 'packaged foods') return '🥫';
  if (cat === 'dairy & eggs') return '🥚';
  if (cat === 'furniture') return '🛋️';
  if (cat === 'home appliances') return '📺';
  if (cat === 'office supplies') return '✂️';

  return '📦';
};

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const dispatch = useDispatch();

  // Monolithic Body Logic

  const { user, token, card, sidebarCollapsed, activeBusinessId } = useSelector(state => state.auth);

  const getActiveVendorType = () => {
    if (!user) return 'Store Vendor';
    const activeBiz = user.businesses?.find(b => b._id.toString() === activeBusinessId?.toString());
    const rawType = activeBiz ? activeBiz.vendorType : (user.baseVendorType || user.vendorType);
    const rawCat = activeBiz ? activeBiz.category : user.category;
    const rawSubcat = activeBiz ? activeBiz.subcategory : user.subcategory;
    return getBaseVendorType(rawType, rawCat, rawSubcat) || 'Store Vendor';
  };
  const vendorType = getActiveVendorType();

  const getTerms = () => {
    const isHospitalBiz = ['Hospital Vendor'].includes(vendorType);
    const isServiceBiz = ['Service Provider Vendor'].includes(vendorType);
    const isJobBiz = ['Job Vendor'].includes(vendorType);
    const isEducationBiz = ['Education Vendor'].includes(vendorType);
    const isStayBiz = ['Hotel Vendor'].includes(vendorType);
    const isFoodBiz = ['Restaurant Vendor'].includes(vendorType);
    const isTravelBiz = ['Travel Agency Vendor'].includes(vendorType);
    const isGroceryBiz = ['Grocery Vendor'].includes(vendorType);
    const isPharmacyBiz = ['Pharmacy Vendor'].includes(vendorType);

    let orderStatuses = ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Completed', 'Cancelled'];
    if (isJobBiz) {
      orderStatuses = ['Pending', 'Shortlisted', 'Interviewing', 'Hired', 'Rejected'];
    } else if (isEducationBiz) {
      orderStatuses = ['Pending', 'Approved', 'Enrolled', 'Completed', 'Cancelled'];
    } else if (isHospitalBiz) {
      orderStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    } else if (isStayBiz) {
      orderStatuses = ['Pending', 'Accepted', 'Checked In', 'Checked Out', 'Cancelled'];
    } else if (isServiceBiz) {
      orderStatuses = ['Pending', 'Accepted', 'Completed', 'Cancelled'];
    }

    return {
      ordersName: isHospitalBiz ? 'Appointments' : (isServiceBiz ? 'Bookings' : (isJobBiz ? 'Applications' : (isEducationBiz ? 'Enrollments' : 'Orders'))),
      ordersSub: isHospitalBiz ? 'Manage patient appointments and scheduling' : (isServiceBiz ? 'Manage customer bookings and scheduling' : (isJobBiz ? 'Manage candidate job applications and recruitment' : (isEducationBiz ? 'Manage student class enrollments' : 'Manage customer orders and transactions'))),
      customersName: isHospitalBiz ? 'Patients' : (isServiceBiz ? 'Customers' : (isJobBiz ? 'Candidates' : (isEducationBiz ? 'Students' : 'Customers'))),
      customersSub: isHospitalBiz ? 'View patient appointment history' : (isServiceBiz ? 'View customer booking history' : (isJobBiz ? 'View candidate application history' : (isEducationBiz ? 'View student enrollment history' : 'View customer order history'))),
      customerSpentLabel: isHospitalBiz ? 'Total Paid (₹)' : (isServiceBiz ? 'Total Spent (₹)' : 'Total Spent (₹)'),
      orderStatuses
    };
  };

  const terms = getTerms();

  const getOrderVendorType = (order) => {
    const parentId = user?.parentUserId || user?._id || '';
    if (order.vendorId === parentId.toString()) {
      return user?.vendorType || 'Store Vendor';
    }
    const biz = user?.businesses?.find(b => b._id.toString() === order.vendorId.toString());
    return biz ? biz.vendorType : (user?.vendorType || 'Store Vendor');
  };

  const getAvailableVendorTypes = () => {
    const types = new Set();
    if (user?.vendorType) {
      types.add(user.vendorType);
    }
    if (user?.businesses) {
      user.businesses.forEach(b => {
        if (b.vendorType) types.add(b.vendorType);
      });
    }
    return Array.from(types);
  };

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // Guard helper to validate if a tab is allowed for the user's role and category
  const isTabAllowed = (tab, role, vType) => {
    if (!tab) return false;
    if (role === 'Admin') {
      return ['dashboard', 'requests', 'vendors', 'members', 'payments', 'settings'].includes(tab);
    }
    if (role === 'Member') {
      return ['dashboard', 'discounts', 'redeem', 'payments', 'renewal', 'Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'].includes(tab);
    }
    if (role === 'Vendor') {
      const allowed = ['dashboard', 'catalog', 'orders', 'customers', 'payments', 'profile', 'business'];
      if (!['Education Vendor', 'Job Vendor'].includes(vType)) {
        allowed.push('delivery');
      }
      return allowed.includes(tab);
    }
    return false;
  };

  const [activeTab, setActiveTabInternal] = useState(() => {
    const initial = tabParam || 'dashboard';
    return isTabAllowed(initial, user?.role, vendorType) ? initial : 'dashboard';
  });

  const setActiveTab = (tab) => {
    if (isTabAllowed(tab, user?.role, vendorType)) {
      setActiveTabInternal(tab);
    } else {
      setActiveTabInternal('dashboard');
    }
  };

  useEffect(() => {
    if (tabParam) {
      if (isTabAllowed(tabParam, user?.role, vendorType)) {
        setActiveTabInternal(tabParam);
      } else {
        setActiveTabInternal('dashboard');
      }
    }
  }, [tabParam, user, vendorType]);
  const [selectedSoldItem, setSelectedSoldItem] = useState(null);
  const [isSoldDetailsModalOpen, setIsSoldDetailsModalOpen] = useState(false);

  // Admin & Member State Additions
  const [vendorRequests, setVendorRequests] = useState([]);
  const [adminVendors, setAdminVendors] = useState([]);
  const [adminMembers, setAdminMembers] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [membershipHistory, setMembershipHistory] = useState([]);
  const [memberDiscounts, setMemberDiscounts] = useState([]);
  const [memberRedeemProducts, setMemberRedeemProducts] = useState([]);
  const [selectedRedeemVendorId, setSelectedRedeemVendorId] = useState('');
  const [selectedRedeemProductId, setSelectedRedeemProductId] = useState('');
  const [redeemForm, setRedeemForm] = useState({ tableNumber: '', roomNumber: '', appointmentDate: '', doctorName: '', prescriptionUrl: '', appointmentTimeSlot: '' });
  const [bookedSlots, setBookedSlots] = useState([]);
  const [isDiamondBlurred, setIsDiamondBlurred] = useState(false);
  const [appointmentsSubView, setAppointmentsSubView] = useState('list');
  const [isAddAppointmentModalOpen, setIsAddAppointmentModalOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    memberName: '',
    memberId: '',
    productId: '',
    appointmentDate: '',
    appointmentTimeSlot: '',
    finalAmount: '',
    status: 'Accepted'
  });
  const [loadingAddAppointment, setLoadingAddAppointment] = useState(false);
  const [isAddBookingModalOpen, setIsAddBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    memberName: '',
    memberId: '',
    productId: '',
    appointmentDate: '',
    appointmentTimeSlot: '1',
    roomNumber: '',
    finalAmount: '',
    status: 'Accepted'
  });
  const [loadingAddBooking, setLoadingAddBooking] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [customSlotInput, setCustomSlotInput] = useState('');
  const [editingDoctorSlotsId, setEditingDoctorSlotsId] = useState(null);
  const [tempSlots, setTempSlots] = useState([]);

  const [memberCategorySearch, setMemberCategorySearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedStorefrontVendor, setSelectedStorefrontVendor] = useState(null);
  const [isStorefrontModalOpen, setIsStorefrontModalOpen] = useState(false);
  const [loadingStorefront, setLoadingStorefront] = useState(false);
  const [storefrontProducts, setStorefrontProducts] = useState([]);

  const handleOpenStorefront = async (vendor) => {
    setSelectedStorefrontVendor(vendor);
    setIsStorefrontModalOpen(true);
    setLoadingStorefront(true);
    try {
      const res = await axios.get(`${getVendorBackendUrl()}/api/member/vendors/${vendor.id}/products`, getAxiosConfig());
      if (res.data.success) {
        setStorefrontProducts(res.data.data);
      }
    } catch (err) {
      console.error('Error loading storefront products:', err);
    } finally {
      setLoadingStorefront(false);
    }
  };

  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isEditPartner, setIsEditPartner] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ name: '', phone: '', vehicleNumber: '', status: 'Available', imageUrl: '' });
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddBusinessModalOpen, setIsAddBusinessModalOpen] = useState(false);
  const [addBizForm, setAddBizForm] = useState({ businessName: '', vendorType: '', category: '', subcategory: '' });
  const [addingBizLoading, setAddingBizLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    businessName: user?.businessName || '',
    agentName: user?.agentName || '',
    alternateVendorName: user?.alternateVendorName || '',
    contactPerson: user?.contactPerson || '',
    mobileNumber: user?.mobileNumber || '',
    address: user?.address || '',
    street: user?.street || '',
    city: user?.city || '',
    state: user?.state || '',
    country: user?.country || '',
    postalCode: user?.postalCode || '',
    telephone: user?.telephone || '',
    fax: user?.fax || '',
    alternateNumber: user?.alternateNumber || '',
    coPartnerName: user?.coPartnerName || '',
    gstStatus: user?.gstStatus || 'Non-GST Declared',
    panNo: user?.panNo || '',
    companyRegNo: user?.companyRegNo || '',
    gstNumber: user?.gstNumber || '',
    msmeStatus: user?.msmeStatus || 'Non-MSME',
    businessLicense: user?.businessLicense || '',
    accountHolderName: user?.accountHolderName || '',
    bankName: user?.bankName || '',
    bankBranch: user?.bankBranch || '',
    bankStreet: user?.bankStreet || '',
    bankCity: user?.bankCity || '',
    accountNo: user?.accountNo || '',
    ifscCode: user?.ifscCode || '',
    swiftCode: user?.swiftCode || ''
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        businessName: user.businessName || '',
        agentName: user.agentName || '',
        alternateVendorName: user.alternateVendorName || '',
        contactPerson: user.contactPerson || '',
        mobileNumber: user.mobileNumber || '',
        address: user.address || '',
        street: user.street || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        postalCode: user.postalCode || '',
        telephone: user.telephone || '',
        fax: user.fax || '',
        alternateNumber: user.alternateNumber || '',
        coPartnerName: user.coPartnerName || '',
        gstStatus: user.gstStatus || 'Non-GST Declared',
        panNo: user.panNo || '',
        companyRegNo: user.companyRegNo || '',
        gstNumber: user.gstNumber || '',
        msmeStatus: user.msmeStatus || 'Non-MSME',
        businessLicense: user.businessLicense || '',
        accountHolderName: user.accountHolderName || '',
        bankName: user.bankName || '',
        bankBranch: user.bankBranch || '',
        bankStreet: user.bankStreet || '',
        bankCity: user.bankCity || '',
        accountNo: user.accountNo || '',
        ifscCode: user.ifscCode || '',
        swiftCode: user.swiftCode || ''
      });
    }
  }, [user]);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [showForgotFlow, setShowForgotFlow] = useState(false);
  const [otp, setOtp] = useState('');
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Sidebar Controls and UI States
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [notifications, setNotifications] = useState([]);
  const [showHeaderNotifications, setShowHeaderNotifications] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [language, setLanguage] = useState("English");

  const notificationDropdownRef = useRef(null);
  const prevOrdersRef = useRef([]);

  // Notifications and statuses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <DashboardContext.Provider value={{
      activeBusinessId,
      activeTab,
      addBizForm,
      addingBizLoading,
      adminMembers,
      adminVendors,
      analytics,
      appointmentForm,
      appointmentsSubView,
      bookedSlots,
      bookingForm,
      calendarMonth,
      calendarSelectedDate,
      calendarYear,
      card,
      catalog,
      commissionConfig,
      customSlotInput,
      customers,
      dispatch,
      editingDoctorSlotsId,
      error,
      getAvailableVendorTypes,
      getOrderVendorType,
      imageUploading,
      isAddAppointmentModalOpen,
      isAddBookingModalOpen,
      isAddBusinessModalOpen,
      isBillModalOpen,
      isDiamondBlurred,
      isEditItem,
      isEditPartner,
      isHelpOpen,
      isItemModalOpen,
      isPartnerModalOpen,
      isProfileModalOpen,
      isSoldDetailsModalOpen,
      isTabAllowed,
      isUserInfoOpen,
      itemForm,
      language,
      loading,
      loadingAddAppointment,
      loadingAddBooking,
      memberDiscounts,
      memberRedeemProducts,
      membershipHistory,
      membershipPlans,
      message,
      notificationDropdownRef,
      notifications,
      orders,
      otp,
      partnerForm,
      partners,
      passwordForm,
      prevOrdersRef,
      profileForm,
      redeemForm,
      searchParams,
      selectedBillOrder,
      selectedItemId,
      selectedMainCat,
      selectedPartnerId,
      selectedRedeemProductId,
      selectedRedeemVendorId,
      selectedSettlementStatus,
      selectedSoldItem,
      selectedSubcat,
      setActiveTab,
      setActiveTabInternal,
      setAddBizForm,
      setAddingBizLoading,
      setAdminMembers,
      setAdminVendors,
      setAnalytics,
      setAppointmentForm,
      setAppointmentsSubView,
      setBookedSlots,
      setBookingForm,
      setCalendarMonth,
      setCalendarSelectedDate,
      setCalendarYear,
      setCatalog,
      setCommissionConfig,
      setCustomSlotInput,
      setCustomers,
      setEditingDoctorSlotsId,
      setError,
      setImageUploading,
      setIsAddAppointmentModalOpen,
      setIsAddBookingModalOpen,
      setIsAddBusinessModalOpen,
      setIsBillModalOpen,
      setIsDiamondBlurred,
      setIsEditItem,
      setIsEditPartner,
      setIsHelpOpen,
      setIsItemModalOpen,
      setIsPartnerModalOpen,
      setIsProfileModalOpen,
      setIsSoldDetailsModalOpen,
      setIsUserInfoOpen,
      setItemForm,
      setLanguage,
      setLoading,
      setLoadingAddAppointment,
      setLoadingAddBooking,
      setMemberDiscounts,
      setMemberRedeemProducts,
      setMembershipHistory,
      setMembershipPlans,
      setMessage,
      setNotifications,
      setOrders,
      setOtp,
      setPartnerForm,
      setPartners,
      setPasswordForm,
      setProfileForm,
      setRedeemForm,
      setSelectedBillOrder,
      setSelectedItemId,
      setSelectedMainCat,
      setSelectedPartnerId,
      setSelectedRedeemProductId,
      setSelectedRedeemVendorId,
      setSelectedSettlementStatus,
      setSelectedSoldItem,
      setSelectedSubcat,
      setSettlements,
      setShowForgotFlow,
      setShowHeaderNotifications,
      setTempSlots,
      setTheme,
      setTxCurrentPage,
      setTxDateRange,
      setTxFilterPeriod,
      setTxSearchQuery,
      setTxSortConfig,
      setVendorRequests,
      settlements,
      shouldShowStock,
      showForgotFlow,
      showHeaderNotifications,
      sidebarCollapsed,
      tempSlots,
      terms,
      theme,
      token,
      txCurrentPage,
      txDateRange,
      txFilterPeriod,
      txItemsPerPage,
      txSearchQuery,
      txSortConfig,
      user,
      vendorRequests,
      vendorType,
      memberCategorySearch,
      setMemberCategorySearch,
      selectedCategoryFilter,
      setSelectedCategoryFilter,
      selectedStorefrontVendor,
      setSelectedStorefrontVendor,
      isStorefrontModalOpen,
      setIsStorefrontModalOpen,
      loadingStorefront,
      setLoadingStorefront,
      storefrontProducts,
      setStorefrontProducts,
      handleOpenStorefront
    }}>
      {children}
    </DashboardContext.Provider>
  );
};
