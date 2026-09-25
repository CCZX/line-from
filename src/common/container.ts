import { Container, BindingScopeEnum } from 'inversify';
import { buildProviderModule } from 'inversify-binding-decorators';
import '@lineform/domain';
import './service';

const container = new Container({
	// 【核心配置】将容器默认的生命周期从 Transient（瞬时）改为 Singleton（单例）
	defaultScope: BindingScopeEnum.Singleton,
});
container.load(buildProviderModule());

export { container };
