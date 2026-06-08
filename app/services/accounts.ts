/**
 * 演示账号目录（学生 + 教师）
 * 登录时按账号匹配，命中则校验密码并带出姓名与角色；未命中则按自由填写的虚拟登录处理。
 */
export type Role = "student" | "teacher";

export interface Account {
  id: string;
  name: string;
  password: string;
  role: Role;
}

export const demoAccounts: Account[] = [
  { id: "20220301045", name: "李泽宇", password: "Lzy@2022", role: "student" },
  { id: "020230884", name: "徐老师", password: "123456", role: "teacher" },
  { id: "0001401", name: "陈老师", password: "123456", role: "teacher" },
];

export function findAccount(id: string): Account | undefined {
  const key = (id || "").trim();
  return demoAccounts.find((a) => a.id === key);
}
