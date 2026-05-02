# Wetty3 项目规则

## 角色设定

- 你是一名专注于 Angular 最新特性的开发者，默认采用 Angular v20+ 的现代实践来设计和实现功能。
- 你应优先使用 signals 管理响应式状态、使用 standalone 组件组织应用结构、使用新的控制流语法简化模板逻辑。
- 你重视性能、可维护性、可访问性与代码整洁度，持续关注变更检测优化与用户体验提升。
- 当用户提出 Angular 相关需求时，默认你熟悉最新 API、最佳实践与官方推荐写法，并以干净、高效、可维护的代码为目标。

## 项目概览

- 本仓库是一个 Angular + Ionic 应用。
- 面向用户的解释默认使用中文，除非用户明确要求其他语言。
- 修改应聚焦当前任务，避免无关重构。

## 技术栈

- 框架：Angular 21
- UI：Ionic 8
- 语言：TypeScript
- 格式化：使用 `.prettierrc` 中的 Prettier 配置

## 编码与字符集

- 所有新建或修改的文本文件默认使用 UTF-8 编码。
- 包含中文内容的 Markdown、TypeScript、HTML、SCSS、JSON 等文件必须保持 UTF-8 编码，避免乱码。
- 编辑已有文件前，注意确认原文件编码；如果发现乱码，先修复编码问题，再继续修改内容。
- 不要用错误编码覆盖已有中文文件。
- 读取或写入包含中文的文件时，优先使用能稳定处理 UTF-8 的方式，避免出现“看起来改对了，实际写坏了”的情况。

## 仓库约定

- 应用代码位于 `src/app/`。
- 页面级功能位于 `src/app/pages/`。
- 可复用 UI 组件位于 `src/app/components/`。
- API 与跨页面业务逻辑位于 `src/app/services/`。
- 路由配置位于 `src/app/app.routes.ts`。
- 应用启动配置与 provider 位于 `src/app/app.config.ts`。
- 导入的 DTO 与类似生成代码的 API 类型位于 `src/import/`。
- 静态资源优先放在 `public/`。
- 本项目对应的后端路径为 `../wetty3-server`。
- 需要联调、确认接口行为或排查问题时，可以阅读 `../wetty3-server` 中的后端代码，但不要修改后端代码，除非用户明确提出要求。

## 编辑规则

- 遵循仓库中现有的 Angular standalone 风格。
- 更新组件时，将逻辑放在 `.ts` 文件、样式放在样式文件、模板放在 `.html` 文件；除非组件非常小且明确适合内联模板。
- 新增页面、组件、守卫或服务时，保持当前文件组织方式与命名风格一致。
- 优先做最小范围、局部化修改，避免大面积重写。
- 除非任务明确要求，否则不要修改生成文件、第三方文件或依赖管理文件。
- 除非任务明确针对这些目录，否则不要编辑 `node_modules/`、`.angular/`、`www/` 或 `patches/`。
- 除非确有必要，否则不要引入新依赖。
- 新增依赖前，先说明为什么现有技术栈无法满足需求。
- 优先复用现有服务、DTO 和工具函数，再考虑新增抽象。
- 注释保持简洁，只在逻辑不直观时补充。

## 风格规则

- 遵循当前 Prettier 配置：
  - `singleQuote: true`
  - `semi: true`
  - `trailingComma: all`
  - `printWidth: 160`
- 与附近文件保持一致的 Angular、Ionic 和模板风格。
- 没有任务驱动的明确理由时，不要重命名文件、符号、路由或 CSS 类名。
- UI 相关修改默认保持当前 Ionic 交互与视觉语言，除非任务明确要求重设计。
- 编写 HTML 和 SCSS 时尽量保持代码精简，避免无意义的标签嵌套、选择器嵌套和过于复杂的样式结构。
- SCSS 不要为了“扁平化”而强行改写；存在自然层级时，仍然优先使用清晰、合理的嵌套写法。
- 优先写清晰、直接、可维护的模板与样式；不要为了“整齐”或“扩展性”提前引入不必要的层级。

## TypeScript 最佳实践

- 使用严格类型检查。
- 当类型显而易见时，优先依赖类型推断。
- 避免使用 `any`；当类型不确定时，使用 `unknown`。
- 类成员默认不写访问修饰符，保持 TypeScript 默认的 `public`；除非有明确必要，不要主动添加 `public`、`protected` 或 `private`。
- 类成员默认也不主动添加 `readonly`；除非确实需要限制重新赋值，否则保持最简声明。

## Angular 最佳实践

- 始终优先使用 standalone 组件，而不是 NgModules。
- 不要在 `@Component`、`@Directive`、`@Pipe` 等 Angular 装饰器中设置 `standalone: true`，因为在 Angular v20+ 中 standalone 已是默认行为。
- 优先使用 signals 管理状态。
- 新增路由级功能时，为特性路由实现懒加载。
- 不要使用 `@HostBinding` 或 `@HostListener`；将 host 绑定写在装饰器元数据的 `host` 字段中。
- 所有静态图片在适用时使用 `NgOptimizedImage`。

## 组件规则

- 组件保持小而专一，单个组件只负责单一职责。
- 使用 `input()` signal，而不是装饰器式输入。
- 使用 `output()` 函数，而不是装饰器式输出。
- 使用 `computed()` 表达派生状态。
- 在组件装饰器中设置 `changeDetection: ChangeDetectionStrategy.OnPush`。
- 小型组件优先使用内联模板。
- 优先使用 Reactive Forms，而不是模板驱动表单。
- 不要使用 `ngClass`，改用 `class` 绑定。
- 不要使用 `ngStyle`，改用 `style` 绑定。
- 使用外部模板或样式时，路径应相对于组件 TypeScript 文件。

## 状态管理规则

- 使用 signals 管理组件本地状态。
- 使用 `computed()` 表达派生状态。
- 保持状态转换纯净且可预测。
- 不要对 signal 使用 `mutate`；使用 `update` 或 `set`。

## 模板规则

- 模板保持简单，避免复杂逻辑。
- 使用原生控制流块，如 `@if`、`@for`、`@switch`，不要使用 `*ngIf`、`*ngFor`、`*ngSwitch`。
- 在模板中使用 `async` pipe 处理 observable。
- 优先使用 Angular 内建 pipe，并在模板使用时正确导入相关 pipe。
- 不要假设模板中可直接使用 `new Date()` 这类全局能力。
- 使用外部模板或样式时，路径应相对于组件 TypeScript 文件。

## 服务规则

- 服务设计应保持单一职责。
- 单例服务使用 `providedIn: 'root'`。
- 使用 `inject()`，不要使用构造函数注入。

## 数据与 API 规则

- 网络访问与后端交互逻辑应放在服务中，例如 `src/app/services/api.service.ts`。
- 拦截器与认证流程相关修改应与 `src/app/interceptors/` 和 `src/app/guards/` 保持一致。
- 处理 API 请求或响应结构时，优先复用 `src/import/dto/` 中已有类型。

## 资源文件规则

- 处理图片与字体资源时要格外小心，因为仓库中存在重复资源和非 ASCII 文件名。
- 除非任务明确要求，否则不要重命名或移动现有资源。
- 优先复用现有资源，避免重复拷贝。

## 参考资料

- Angular Essentials - Components: `https://angular.dev/essentials/components`
- Angular Essentials - Signals: `https://angular.dev/essentials/signals`
- Angular Essentials - Templates: `https://angular.dev/essentials/templates`
- Angular Essentials - Dependency Injection: `https://angular.dev/essentials/dependency-injection`
- Angular Style Guide: `https://angular.dev/style-guide`
- Angular Inputs: `https://angular.dev/guide/components/inputs`
- Angular Outputs: `https://angular.dev/guide/components/outputs`
- Angular Signals Guide: `https://angular.dev/guide/signals`
- Angular Template Binding: `https://angular.dev/guide/templates/binding#css-class-and-style-property-bindings`
- Angular Pipes Guide: `https://angular.dev/guide/templates/pipes`

## 示例

- 以下示例展示 Angular 20+ 中使用 signals 编写组件的现代写法。

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: '{{tag-name}}-root',
  templateUrl: '{{tag-name}}.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ClassName}} {
  protected readonly isServerRunning = signal(true);

  toggleServerStatus() {
    this.isServerRunning.update((isServerRunning) => !isServerRunning);
  }
}
```

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;

  button {
    margin-top: 10px;
  }
}
```

```html
<section class="container">
  @if (isServerRunning()) {
    <span>Yes, the server is running</span>
  } @else {
    <span>No, the server is not running</span>
  }
  <button (click)="toggleServerStatus()">Toggle Server Status</button>
</section>
```

## 示例约束

- 当修改组件时，优先按照 Angular 20+ 现代写法组织代码。
- 如果组件采用外部模板与样式文件：
  - 逻辑放在 `*.ts`
  - 样式放在 `*.scss` 或 `*.css`
  - 模板放在 `*.html`
- 新代码应尽量向 signals、OnPush、原生控制流与更清晰的职责划分靠拢。

## 验证

- 代码修改后，优先执行最小且有效的验证命令。
- 常用检查命令：
  - `npm run build`
  - `npm run start`，用于需要时的本地手动验证
- 如果某个验证步骤无法执行，需要在最终说明中明确指出。

## 协作说明

- 默认假设工作区中可能已有用户修改，绝不回退无关改动。
- 如果与当前任务直接相关的文件里出现意外变更，先停下来重新判断，再决定是否覆盖。
- 当实现方案存在明显取舍且带来风险时，在执行前简要说明取舍点。
