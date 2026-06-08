/**
 * 账号目录（学生 + 教师）
 * 登录时按账号匹配，命中则校验密码并带出姓名与角色；未命中则按自由填写的虚拟登录处理。
 * 学生名册来源：学生信息表-2024，统一初始密码 123456。
 */
export type Role = "student" | "teacher";

export interface Account {
  id: string;
  name: string;
  password: string;
  role: Role;
}

const STUDENT_PASSWORD = "123456";

// 2024 级学生名册（学号 + 姓名）
const studentRoster: { id: string; name: string }[] = [
  { id: "240403030201", name: "陈佳妍" },
  { id: "240403030202", name: "林蓉君" },
  { id: "240403030203", name: "林怡希" },
  { id: "240403030204", name: "方晓晶" },
  { id: "240403030205", name: "林佳怡" },
  { id: "240403030206", name: "关元鑫" },
  { id: "240403030207", name: "黄翰铭" },
  { id: "240403030208", name: "柯海明" },
  { id: "240403030209", name: "陈轩宇" },
  { id: "240403030210", name: "吴莎莎" },
  { id: "240403030211", name: "赖淑怡" },
  { id: "240403030212", name: "孙诗瑶" },
  { id: "240403030213", name: "沈咏薇" },
  { id: "240403030214", name: "陈锦华" },
  { id: "240403030215", name: "陈玥婷" },
  { id: "240403030216", name: "张诗淇" },
  { id: "240403030217", name: "蔡雅玲" },
  { id: "240403030218", name: "潘婷婷" },
  { id: "240403030219", name: "钟仰民" },
  { id: "240403030220", name: "许漪诺" },
  { id: "240403030221", name: "彭雅旋" },
  { id: "240403030222", name: "刘心怡" },
  { id: "240403030223", name: "潘智涵" },
  { id: "240403030224", name: "潘增浩" },
];

export const studentAccounts: Account[] = studentRoster.map((s) => ({
  ...s,
  password: STUDENT_PASSWORD,
  role: "student" as const,
}));

export const teacherAccounts: Account[] = [
  { id: "020230884", name: "徐老师", password: "123456", role: "teacher" },
  { id: "0001401", name: "陈老师", password: "123456", role: "teacher" },
];

// 完整账号目录：用于登录校验
export const allAccounts: Account[] = [...teacherAccounts, ...studentAccounts];

// 登录页快捷填充用的精选账号（两位教师 + 一名学生）
export const demoAccounts: Account[] = [...teacherAccounts, studentAccounts[0]];

export function findAccount(id: string): Account | undefined {
  const key = (id || "").trim();
  return allAccounts.find((a) => a.id === key);
}
